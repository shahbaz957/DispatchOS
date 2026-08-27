import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DispatchModule } from './dispatch.module';

async function bootstrap() {
  const app = await NestFactory.create(DispatchModule);
  app.enableCors();

  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'dispatch-service-consumer',
        brokers,
        allowAutoTopicCreation: true,
      },
      consumer: {
        groupId: 'dispatch-consumer',
      },
    },
  });

  await app.startAllMicroservices();

  const port = Number(process.env.DISPATCH_HTTP_PORT ?? 3002);
  await app.listen(port);
  Logger.log(
    `Dispatch service is running on http://localhost:${port}`,
    'dispatch',
  );
}
void bootstrap();
