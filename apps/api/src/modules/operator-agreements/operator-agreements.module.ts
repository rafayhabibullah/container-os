import { Module } from '@nestjs/common';
import { OperatorAgreementsService } from './operator-agreements.service';
import { OperatorAgreementsController } from './operator-agreements.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule, DocumentsModule],
  controllers: [OperatorAgreementsController],
  providers: [OperatorAgreementsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [OperatorAgreementsService],
})
export class OperatorAgreementsModule {}
