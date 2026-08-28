import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientKafka } from '@nestjs/microservices';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { AssignmentStatus, Prisma } from './generated/prisma';
import {
  DispatchEventType,
  DriverEventType,
} from './enums/dispatch-event-type.enum';
import { PrismaService } from './prisma.service';
import { REDIS_CLIENT } from './redis.provider';

export const DISPATCH_EVENTS_TOPIC = 'dispatch.events';
export const DRIVERS_GEO_KEY = 'drivers:geo';
export const SEARCH_RADIUS_KM = 5;
/** Max radius when expanding beyond the 5 km pool (nearest-first fallback). */
const FALLBACK_RADIUS_KM = 5000;
const OFFER_TTL_SECONDS = 30;

export type OrderCreatedEvent = {
  id?: string;
  latitude?: number;
  longitude?: number;
};

export type DriverLifecycleEvent = {
  eventType?: string;
  driverId?: string;
  orderId?: string | null;
};

@Injectable()
export class DispatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchService.name);

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
    return { status: 'ok', service: 'dispatch' };
  }

  findAll() {
    return this.prisma.assignment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleOrderCreated(event: OrderCreatedEvent) {
    if (
      !event?.id ||
      typeof event.latitude !== 'number' ||
      typeof event.longitude !== 'number'
    ) {
      return;
    }

    const existing = await this.prisma.assignment.findFirst({
      where: { orderId: event.id },
    });
    if (existing) {
      this.logger.log(`Skip order ${event.id}, assignment already exists`);
      return;
    }

    await this.offerToNearbyDriver(event.id, event.latitude, event.longitude);
  }

  async handleDriverEvent(event: DriverLifecycleEvent) {
    if (!event?.eventType || !event.driverId || !event.orderId) {
      return;
    }

    if (event.eventType === DriverEventType.ASSIGNMENT_ACCEPTED) {
      await this.confirmAssignment(event.orderId, event.driverId);
      return;
    }

    if (event.eventType === DriverEventType.ASSIGNMENT_REJECTED) {
      await this.rejectAssignment(event.orderId, event.driverId);
      return;
    }

    if (event.eventType === DriverEventType.ORDER_COMPLETED) {
      await this.completeAssignment(event.orderId, event.driverId);
      return;
    }

    if (event.eventType === DriverEventType.ORDER_CANCELLED) {
      await this.cancelAssignment(event.orderId, event.driverId);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleExpiredOffers() {
    const expired = await this.prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.OFFERED,
        expiresAt: { lt: new Date() },
      },
    });

    for (const assignment of expired) {
      const timedOut = await this.prisma.assignment.updateMany({
        where: { id: assignment.id, status: AssignmentStatus.OFFERED },
        data: { status: AssignmentStatus.TIMEOUT },
      });
      if (timedOut.count === 0) {
        continue;
      }

      await this.releaseLock(assignment.driverId);
      await this.emitDispatchEvent({
        eventType: DispatchEventType.ASSIGNMENT_TIMEOUT,
        orderId: assignment.orderId,
        driverId: assignment.driverId,
        assignmentId: assignment.id,
        attempt: assignment.attempt,
      });
      this.logger.log(
        `Assignment ${assignment.id} timed out; re-dispatching order ${assignment.orderId}`,
      );
      await this.offerToNearbyDriver(
        assignment.orderId,
        assignment.latitude,
        assignment.longitude,
      );
    }
  }

  private async confirmAssignment(orderId: string, driverId: string) {
    const assignment = await this.findOpenOffer(orderId, driverId);
    if (!assignment) {
      return;
    }

    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.CONFIRMED },
    });

    await this.emitDispatchEvent({
      eventType: DispatchEventType.ASSIGNMENT_CONFIRMED,
      orderId,
      driverId,
      assignmentId: assignment.id,
      attempt: assignment.attempt,
    });
    this.logger.log(
      `Driver ${driverId} confirmed assignment ${assignment.id} for order ${orderId}`,
    );
  }

  private async rejectAssignment(orderId: string, driverId: string) {
    const assignment = await this.findOpenOffer(orderId, driverId);
    if (!assignment) {
      return;
    }

    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.REJECTED },
    });
    await this.releaseLock(driverId);
    this.logger.log(
      `Driver ${driverId} rejected assignment ${assignment.id}; re-dispatching order ${orderId}`,
    );
    await this.offerToNearbyDriver(
      assignment.orderId,
      assignment.latitude,
      assignment.longitude,
    );
  }

  private async completeAssignment(orderId: string, driverId: string) {
    const assignment = await this.findConfirmedAssignment(orderId, driverId);
    if (!assignment) {
      return;
    }

    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.COMPLETED },
    });
    await this.releaseLock(driverId);
    await this.emitDispatchEvent({
      eventType: DispatchEventType.ASSIGNMENT_COMPLETED,
      orderId,
      driverId,
      assignmentId: assignment.id,
      attempt: assignment.attempt,
    });
    this.logger.log(`Assignment ${assignment.id} completed for order ${orderId}`);
  }

  private async cancelAssignment(orderId: string, driverId: string) {
    const assignment = await this.findConfirmedAssignment(orderId, driverId);
    if (!assignment) {
      return;
    }

    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: { status: AssignmentStatus.CANCELLED },
    });
    await this.releaseLock(driverId);
    await this.emitDispatchEvent({
      eventType: DispatchEventType.ASSIGNMENT_CANCELLED,
      orderId,
      driverId,
      assignmentId: assignment.id,
      attempt: assignment.attempt,
    });
    this.logger.log(
      `Assignment ${assignment.id} cancelled for order ${orderId}; no re-dispatch`,
    );
  }

  private async offerToNearbyDriver(
    orderId: string,
    latitude: number,
    longitude: number,
  ) {
    const lastAttempt = await this.prisma.assignment.findFirst({
      where: { orderId },
      orderBy: { attempt: 'desc' },
      select: { attempt: true },
    });
    const attempt = lastAttempt ? lastAttempt.attempt + 1 : 1;

    const previousDrivers = await this.prisma.assignment.findMany({
      where: { orderId },
      select: { driverId: true },
    });
    const skippedDriverIds = new Set(
      previousDrivers.map((row) => row.driverId),
    );

    const candidates = await this.findCandidateDriverIds(longitude, latitude);
    for (const driverId of candidates) {
      if (skippedDriverIds.has(driverId)) {
        continue;
      }

      const status = await this.redis.get(`driver:${driverId}:status`);
      if (status !== 'AVAILABLE') {
        continue;
      }

      const lock = await this.redis.set(
        this.lockKey(driverId),
        orderId,
        'EX',
        OFFER_TTL_SECONDS,
        'NX',
      );
      if (lock !== 'OK') {
        continue;
      }

      try {
        const assignment = await this.prisma.assignment.create({
          data: {
            orderId,
            driverId,
            status: AssignmentStatus.OFFERED,
            attempt,
            latitude,
            longitude,
            expiresAt: new Date(Date.now() + OFFER_TTL_SECONDS * 1000),
          },
        });

        await this.emitDispatchEvent({
          eventType: DispatchEventType.ASSIGNMENT_OFFERED,
          orderId,
          driverId,
          assignmentId: assignment.id,
          attempt,
        });
        this.logger.log(
          `Offered order ${orderId} to driver ${driverId} (attempt ${attempt})`,
        );
        return;
      } catch (error) {
        await this.releaseLock(driverId);
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.warn(
            `Duplicate assignment for order ${orderId} attempt ${attempt}`,
          );
          return;
        }
        throw error;
      }
    }

    this.logger.warn(
      `No available driver for order ${orderId} (attempt ${attempt})`,
    );
  }

  /**
   * Drivers within 5 km first (nearest-first), then everyone else by distance.
   * Re-dispatch skips drivers already tried for this order.
   */
  private async findCandidateDriverIds(longitude: number, latitude: number) {
    const nearby = await this.geoSearchByRadius(
      longitude,
      latitude,
      SEARCH_RADIUS_KM,
    );
    const nearbySet = new Set(nearby);
    const fallback = await this.geoSearchByRadius(
      longitude,
      latitude,
      FALLBACK_RADIUS_KM,
    );
    const beyondRadius = fallback.filter((driverId) => !nearbySet.has(driverId));
    return [...nearby, ...beyondRadius];
  }

  private async geoSearchByRadius(
    longitude: number,
    latitude: number,
    radiusKm: number,
  ) {
    const members = (await this.redis.call(
      'GEOSEARCH',
      DRIVERS_GEO_KEY,
      'FROMLONLAT',
      longitude,
      latitude,
      'BYRADIUS',
      radiusKm,
      'km',
      'ASC',
    )) as unknown;

    if (!Array.isArray(members)) {
      return [];
    }

    return members.filter((member): member is string => typeof member === 'string');
  }

  private findOpenOffer(orderId: string, driverId: string) {
    return this.prisma.assignment.findFirst({
      where: { orderId, driverId, status: AssignmentStatus.OFFERED },
    });
  }

  private findConfirmedAssignment(orderId: string, driverId: string) {
    return this.prisma.assignment.findFirst({
      where: { orderId, driverId, status: AssignmentStatus.CONFIRMED },
    });
  }

  private releaseLock(driverId: string) {
    return this.redis.del(this.lockKey(driverId));
  }

  private lockKey(driverId: string) {
    return `lock:driver:${driverId}`;
  }

  private async emitDispatchEvent(payload: {
    eventType: DispatchEventType;
    orderId: string;
    driverId: string;
    assignmentId: string;
    attempt: number;
  }) {
    await firstValueFrom(
      this.kafka.emit(DISPATCH_EVENTS_TOPIC, {
        key: payload.orderId,
        value: {
          ...payload,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }
}
