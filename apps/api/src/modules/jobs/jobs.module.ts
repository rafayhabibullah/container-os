import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SystemTokenGuard } from './system-token.guard';
import { BillingModule } from '../billing/billing.module';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [BillingModule, ReportingModule],
  controllers: [JobsController],
  providers: [JobsService, SystemTokenGuard, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [JobsService],
})
export class JobsModule {}
