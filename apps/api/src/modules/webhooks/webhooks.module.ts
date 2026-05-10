import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhooksController } from './webhooks.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookDeliveryService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [WebhookDeliveryService],
})
export class WebhooksModule {}
