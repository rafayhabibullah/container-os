import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [NotificationsModule, AuditModule, SubscriptionsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [CheckoutService],
})
export class CheckoutModule {}
