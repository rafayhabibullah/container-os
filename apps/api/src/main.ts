import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new DomainExceptionFilter(),
  );

  app.enableShutdownHooks();
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3001' });
  app.setGlobalPrefix('api');

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  Logger.log(`Container OS API running on port ${port}`, 'Bootstrap');
}

bootstrap();
