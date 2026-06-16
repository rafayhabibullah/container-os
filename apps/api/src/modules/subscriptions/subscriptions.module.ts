import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { MollieModule } from '../payments/mollie.module';

@Module({
  imports: [MollieModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
