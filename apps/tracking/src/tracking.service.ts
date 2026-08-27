import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from './generated/prisma';
import { TRACKED_EVENT_TYPES } from './enums/tracked-event-type.enum';
import { PrismaService } from './prisma.service';

const TRACKED_EVENT_TYPE_SET = new Set<string>(TRACKED_EVENT_TYPES);

export type IncomingEvent = Record<string, unknown>;

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return { status: 'ok', service: 'tracking' };
  }

  findByOrderId(orderId: string) {
    return this.prisma.orderTimeline.findMany({
      where: { orderId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async recordOrderCreated(event: IncomingEvent) {
    return this.recordEvent({ ...event, eventType: 'order.created' });
  }

  async recordEvent(event: IncomingEvent) {
    const eventType = this.asString(event.eventType);
    const orderId = this.asString(event.orderId) ?? this.asString(event.id);
    if (!eventType || !orderId || !TRACKED_EVENT_TYPE_SET.has(eventType)) {
      return;
    }

    const driverId = this.asString(event.driverId);
    const eventId = this.buildEventId(event, eventType, orderId);
    const occurredAt = this.parseOccurredAt(event);

    try {
      await this.prisma.orderTimeline.create({
        data: {
          orderId,
          eventId,
          eventType,
          driverId: driverId ?? null,
          payload: event as Prisma.InputJsonValue,
          occurredAt,
        },
      });
      this.logger.log(`Timeline ${eventType} recorded for order ${orderId}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          `Skip duplicate ${eventType} for order ${orderId} (${eventId})`,
        );
        return;
      }
      throw error;
    }
  }

  private buildEventId(
    event: IncomingEvent,
    eventType: string,
    orderId: string,
  ) {
    const explicitId = this.asString(event.eventId);
    if (explicitId) {
      return explicitId;
    }
    if (eventType === 'order.created') {
      return `order.created:${orderId}`;
    }
    const assignmentId = this.asString(event.assignmentId);
    if (assignmentId) {
      return `${assignmentId}:${eventType}`;
    }
    const occurred = this.asString(event.timestamp) ?? this.asString(event.createdAt) ?? '';
    return `${orderId}:${eventType}:${occurred}`;
  }

  private parseOccurredAt(event: IncomingEvent) {
    const raw = this.asString(event.timestamp) ?? this.asString(event.createdAt);
    if (!raw) {
      return new Date();
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private asString(value: unknown) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
