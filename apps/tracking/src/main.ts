import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { TrackingModule } from './tracking.module';

async function bootstrap() {
  const app = await NestFactory.create(TrackingModule);
  app.enableCors();

  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'tracking-service-consumer',
        brokers,
        allowAutoTopicCreation: true,
      },
      consumer: {
        groupId: 'tracking-consumer',
      },
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.TRACKING_HTTP_PORT ?? 3003);
  await app.listen(port);
  Logger.log(
    `Tracking service is running on http://localhost:${port}`,
    'tracking',
  );
}
void bootstrap();
