import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new DomainExceptionFilter(),
  );

  app.enableShutdownHooks();
  const corsOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: corsOrigins });
  app.setGlobalPrefix('api');

  // Swagger — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SiteLager API')
      .setDescription(
        'German multi-site container/self-storage SaaS — REST API v1.\n\n' +
        '**Namespaces:** `/api/public/v1/*` (unauthenticated) · ' +
        '`/api/operator/v1/*` (OIDC Bearer, MFA required) · ' +
        '`/api/tenant/v1/*` (magic-link or password session) · ' +
        '`/api/system/v1/*` (HMAC-SHA256 signed webhooks)\n\n' +
        '**Conventions:** Monetary values in integer euro cents · ' +
        'Timestamps UTC stored, Europe/Berlin rendered · ' +
        'All POST endpoints require `Idempotency-Key` header.',
      )
      .setVersion('0.1.0')
      .setContact('SiteLager', '', '')
      .setLicense('Proprietary', '')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Keycloak JWT (Owner/Operator, MFA required)' }, 'keycloak')
      .addTag('public', 'Unauthenticated — storefront, availability, quotes, lead capture')
      .addTag('operator', 'Operator and Owner — requires Bearer token with MFA')
      .addTag('tenant', 'Tenant portal — requires tenant session token')
      .addTag('system', 'Webhook callbacks — HMAC-SHA256 signed')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        filter: true,
        displayRequestDuration: true,
      },
      customSiteTitle: 'SiteLager — API Docs',
    });

    Logger.log('Swagger UI available at http://localhost:' + (process.env.PORT ?? '3000') + '/docs', 'Bootstrap');
  }

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  Logger.log(`SiteLager API running on port ${port}`, 'Bootstrap');
}

bootstrap();
