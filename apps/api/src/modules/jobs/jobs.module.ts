import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SystemTokenGuard } from './system-token.guard';
import { BillingModule } from '../billing/billing.module';
import { ReportingModule } from '../reporting/reporting.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MollieModule } from '../payments/mollie.module';
import { RentalLifecycleModule } from '../rental-lifecycle/rental-lifecycle.module';

@Module({
  imports: [BillingModule, ReportingModule, NotificationsModule, MollieModule, RentalLifecycleModule],
  controllers: [JobsController],
  providers: [JobsService, SystemTokenGuard, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [JobsService],
})
export class JobsModule {}
