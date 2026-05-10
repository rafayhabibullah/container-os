import { Module } from '@nestjs/common';
import { CrmLeadsService } from './crm-leads.service';
import { DeduplicationService } from './deduplication.service';
import { CrmLeadsController } from './crm-leads.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CrmLeadsController],
  providers: [CrmLeadsService, DeduplicationService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [CrmLeadsService],
})
export class CrmLeadsModule {}
