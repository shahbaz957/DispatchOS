import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';
import { OUTBOX_CREATED_EVENT } from './order.service';

@Injectable()
export class OutboxRelayService implements OnModuleInit {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_SERVICE') private readonly kafka: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  @OnEvent(OUTBOX_CREATED_EVENT, { async: true })
  async handleOutboxCreated(outboxId: string) {
    await this.processSingleEvent(outboxId);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCronFallback() {
    const pendingEvents = await this.prisma.$transaction(async (tx) => {
      return tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "outbox"
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      `;
    });

    for (const event of pendingEvents) {
      await this.processSingleEvent(event.id);
    }
  }

  private async processSingleEvent(outboxId: string) {
    const event = await this.prisma.outbox.findUnique({
      where: { id: outboxId },
    });

    if (!event || event.status !== 'PENDING') {
      return;
    }

    try {
      await firstValueFrom(
        this.kafka.emit(event.eventType, {
          key: event.aggregateId,
          value: event.payload,
        }),
      );

      await this.prisma.outbox.update({
        where: { id: event.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to publish outbox event ${outboxId}`,
        err instanceof Error ? err.stack : String(err),
      );

      await this.prisma.outbox.update({
        where: { id: event.id },
        data: {
          retryCount: { increment: 1 },
          status: event.retryCount >= 5 ? 'FAILED' : 'PENDING',
        },
      });
    }
  }
}
