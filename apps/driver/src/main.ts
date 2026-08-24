import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DriverModule } from './driver.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    DriverModule,
    {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 3004,
      },
    },
  );
  await app.listen();
  Logger.log('Driver service is listening on TCP 3004', 'driver');
}
void bootstrap();
