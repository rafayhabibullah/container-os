import { Module } from '@nestjs/common';
import { TenantPortalService } from './tenant-portal.service';
import { TenantPortalController } from './tenant-portal.controller';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { MollieModule } from '../payments/mollie.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, BillingModule, MollieModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [TenantPortalService],
})
export class TenantPortalModule {}
