import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { ApiKeyService } from './api-key.service';
import { WebhooksController } from './webhooks.controller';
import { OrgWebhooksController } from './org-webhooks.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';
import { OrganisationModule } from '../organisations/organisations.module';

@Module({
  imports: [AuthModule, OrganisationModule],
  controllers: [WebhooksController, OrgWebhooksController],
  providers: [WebhooksService, WebhookDeliveryService, ApiKeyService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [WebhookDeliveryService, ApiKeyService],
})
export class WebhooksModule {}
