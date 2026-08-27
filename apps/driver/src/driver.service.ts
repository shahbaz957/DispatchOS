import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import {
  DriverAction,
  DriverStatus,
  UpdateDriverStatusDto,
} from './dto/update-driver-status.dto';
import { DriverEventType } from './enums/driver-event-type.enum';
import { PrismaService } from './prisma.service';
import { REDIS_CLIENT } from './redis.provider';

export const DRIVER_EVENTS_TOPIC = 'driver.events';
const DRIVERS_GEO_KEY = 'drivers:geo';

@Injectable()
export class DriverService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('KAFKA_SERVICE') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  getHealth() {
    return { status: 'ok', service: 'driver' };
  }

  findAll() {
    return this.prisma.driver.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(driverId: string, dto: UpdateDriverStatusDto) {
    const existingDriver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!existingDriver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    const isCompletion = dto.action === DriverAction.COMPLETE;
    if (
      isCompletion &&
      (dto.latitude === undefined || dto.longitude === undefined)
    ) {
      throw new BadRequestException(
        'Latitude and Longitude of order drop-off are required when action is COMPLETE',
      );
    }

    const newLat = isCompletion ? dto.latitude! : existingDriver.lastLat;
    const newLng = isCompletion ? dto.longitude! : existingDriver.lastLng;

    const updatedDriver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        status: dto.status,
        ...(newLat !== null && { lastLat: newLat }),
        ...(newLng !== null && { lastLng: newLng }),
        lastSeenAt: new Date(),
      },
    });

    await this.redis.set(`driver:${driverId}:status`, dto.status);

    if (
      dto.status === DriverStatus.AVAILABLE &&
      newLat !== null &&
      newLng !== null
    ) {
      await this.redis.geoadd(DRIVERS_GEO_KEY, newLng, newLat, driverId);
    } else if (dto.status === DriverStatus.OFFLINE) {
      await this.redis.zrem(DRIVERS_GEO_KEY, driverId);
    }

    const eventType = this.resolveEventType(dto);
    const eventPayload = {
      eventType,
      driverId: updatedDriver.id,
      orderId: dto.orderId || null,
      previousStatus: existingDriver.status,
      newStatus: updatedDriver.status,
      latitude: newLat,
      longitude: newLng,
      timestamp: new Date().toISOString(),
    };

    await firstValueFrom(
      this.kafka.emit(DRIVER_EVENTS_TOPIC, {
        key: driverId,
        value: eventPayload,
      }),
    );

    this.logger.log(
      `Driver ${driverId} status updated to ${dto.status} [Action: ${dto.action || 'NONE'}, Event: ${eventType}]`,
    );
    return updatedDriver;
  }

  async handleDispatchOfferChange(driverId: string, status: DriverStatus) {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { status, lastSeenAt: new Date() },
    });
    await this.redis.set(`driver:${driverId}:status`, status);
    this.logger.log(
      `Driver ${driverId} status set to ${status} via dispatch event`,
    );
  }

  private resolveEventType(dto: UpdateDriverStatusDto): DriverEventType {
    if (dto.action === DriverAction.ACCEPT) {
      return DriverEventType.ASSIGNMENT_ACCEPTED;
    }
    if (dto.action === DriverAction.DECLINE) {
      return DriverEventType.ASSIGNMENT_REJECTED;
    }
    if (dto.action === DriverAction.COMPLETE) {
      return DriverEventType.ORDER_COMPLETED;
    }
    if (dto.action === DriverAction.CANCEL) {
      return DriverEventType.ORDER_CANCELLED;
    }
    return DriverEventType.STATUS_CHANGED;
  }
}
