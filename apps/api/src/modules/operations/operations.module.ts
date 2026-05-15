import { Module } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { InspectionService } from './inspection.service';
import { OperationsController } from './operations.controller';
import { OrgOperationsController } from './org-operations.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';
import { StorageService } from '../documents/storage.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [OperationsController, OrgOperationsController],
  providers: [OperationsService, InspectionService, StorageService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [OperationsService, InspectionService],
})
export class OperationsModule {}
