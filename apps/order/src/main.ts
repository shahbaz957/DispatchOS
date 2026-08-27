import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { OrderModule } from './order.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
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
        clientId: 'order-service-consumer',
        brokers,
        allowAutoTopicCreation: true,
      },
      consumer: {
        groupId: 'order-consumer',
      },
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.ORDER_HTTP_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`Order service is running on http://localhost:${port}`, 'order');
}
void bootstrap();
