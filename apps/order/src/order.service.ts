import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus, Prisma } from './generated/prisma';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { DispatchOrderEventType } from './enums/dispatch-order-event-type.enum';
import { PrismaService } from './prisma.service';

export type DispatchOrderEvent = {
  eventType?: string;
  orderId?: string;
  driverId?: string;
};

export const ORDER_CREATED_TOPIC = 'order.created';
export const OUTBOX_CREATED_EVENT = 'outbox.event_created';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getHealth() {
    return { status: 'ok', service: 'order' };
  }

  findAll() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateOrderDto) {
    try {
      const { order, outboxRecord } = await this.prisma.$transaction(
        async (tx) => {
          const newOrder = await tx.order.create({
            data: {
              merchantId: dto.merchantId,
              clientOrderId: dto.clientOrderId,
              latitude: dto.latitude,
              longitude: dto.longitude,
            },
          });

          const eventPayload = {
            id: newOrder.id,
            merchantId: newOrder.merchantId,
            clientOrderId: newOrder.clientOrderId,
            status: newOrder.status,
            latitude: newOrder.latitude,
            longitude: newOrder.longitude,
            assignedDriverId: newOrder.assignedDriverId,
            createdAt: newOrder.createdAt.toISOString(),
            updatedAt: newOrder.updatedAt.toISOString(),
          };

          const outbox = await tx.outbox.create({
            data: {
              aggregateId: newOrder.id,
              eventType: ORDER_CREATED_TOPIC,
              payload: eventPayload,
            },
          });

          return { order: newOrder, outboxRecord: outbox };
        },
      );

      this.eventEmitter.emit(OUTBOX_CREATED_EVENT, outboxRecord.id);

      return order;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Order already exists for this merchant and clientOrderId',
        );
      }
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    try {
      return await this.prisma.order.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.assignedDriverId !== undefined
            ? { assignedDriverId: dto.assignedDriverId }
            : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Order ${id} not found`);
      }
      throw error;
    }
  }

  async handleDispatchEvent(event: DispatchOrderEvent) {
    if (!event?.eventType || !event.orderId) {
      return;
    }

    const status = this.statusFromDispatchEvent(event.eventType);
    if (!status) {
      return;
    }

    try {
      await this.prisma.order.update({
        where: { id: event.orderId },
        data: {
          status,
          ...(event.driverId ? { assignedDriverId: event.driverId } : {}),
        },
      });
      this.logger.log(
        `Order ${event.orderId} set to ${status} from ${event.eventType}`,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(
          `Dispatch event ${event.eventType} for unknown order ${event.orderId}`,
        );
        return;
      }
      throw error;
    }
  }

  private statusFromDispatchEvent(eventType: string): OrderStatus | null {
    if (eventType === DispatchOrderEventType.ASSIGNMENT_OFFERED) {
      return OrderStatus.OFFERED;
    }
    if (eventType === DispatchOrderEventType.ASSIGNMENT_CONFIRMED) {
      return OrderStatus.ASSIGNED;
    }
    if (eventType === DispatchOrderEventType.ASSIGNMENT_COMPLETED) {
      return OrderStatus.COMPLETED;
    }
    if (eventType === DispatchOrderEventType.ASSIGNMENT_CANCELLED) {
      return OrderStatus.CANCELLED;
    }
    return null;
  }
}
