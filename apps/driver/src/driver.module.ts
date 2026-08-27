import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { PrismaService } from './prisma.service';
import { RedisProvider } from './redis.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'driver-service',
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
  controllers: [DriverController],
  providers: [DriverService, PrismaService, RedisProvider],
})
export class DriverModule {}
