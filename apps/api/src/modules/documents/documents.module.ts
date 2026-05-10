import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { EvidencePackService } from './evidence-pack.service';
import { DocumentsController } from './documents.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, EvidencePackService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
