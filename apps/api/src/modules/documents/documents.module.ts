import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { EvidencePackService } from './evidence-pack.service';
import { DocumentScanService } from './document-scan.service';
import { DocumentsController } from './documents.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, EvidencePackService, DocumentScanService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [DocumentsService, StorageService, EvidencePackService],
})
export class DocumentsModule {}
