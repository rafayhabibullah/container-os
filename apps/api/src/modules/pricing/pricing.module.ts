import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { QuoteService } from './quote.service';
import { PricingController } from './pricing.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PricingController],
  providers: [PricingService, QuoteService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [QuoteService],
})
export class PricingModule {}
