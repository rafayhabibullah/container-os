import { Module } from '@nestjs/common';
import { SiteInventoryService } from './site-inventory.service';
import { AvailabilityService } from './availability.service';
import { SiteInventoryController } from './site-inventory.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';
import { SiteGuard } from '../../common/guards/site.guard';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [AuthModule, AuditModule, ListingsModule],
  controllers: [SiteInventoryController],
  providers: [SiteInventoryService, AvailabilityService, SiteGuard, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [SiteInventoryService, AvailabilityService],
})
export class SiteInventoryModule {}
