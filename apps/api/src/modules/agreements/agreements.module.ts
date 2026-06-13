import { Module } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { EvidencePackService } from '../documents/evidence-pack.service';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule, DocumentsModule],
  controllers: [AgreementsController],
  providers: [AgreementsService, EvidencePackService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [AgreementsService],
})
export class AgreementsModule {}
