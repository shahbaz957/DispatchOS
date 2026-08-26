import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OutboxRelayService } from './outbox-relay.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'order-service',
              brokers: config
                .get<string>('KAFKA_BROKERS', 'localhost:9092')
                .split(','),
            },
            producerOnlyMode: true,
          },
        }),
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OutboxRelayService, PrismaService],
})
export class OrderModule {}
