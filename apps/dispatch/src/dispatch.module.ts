import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { PrismaService } from './prisma.service';
import { RedisProvider } from './redis.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'dispatch-service',
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
  controllers: [DispatchController],
  providers: [DispatchService, PrismaService, RedisProvider],
})
export class DispatchModule {}
