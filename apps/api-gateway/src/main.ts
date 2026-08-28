import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const port = Number(process.env.API_GATEWAY_PORT ?? 3010);
  await app.listen(port);
  Logger.log(
    `API Gateway is running on http://localhost:${port}`,
    'api-gateway',
  );
}
void bootstrap();
