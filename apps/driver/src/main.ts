import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DriverModule } from './driver.module';

async function bootstrap() {
  const app = await NestFactory.create(DriverModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'driver-service-consumer',
        brokers,
        allowAutoTopicCreation: true,
      },
      consumer: {
        groupId: 'driver-consumer',
      },
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.DRIVER_HTTP_PORT ?? 3004);
  await app.listen(port);
  Logger.log(`Driver service is running on http://localhost:${port}`, 'driver');
}
void bootstrap();
