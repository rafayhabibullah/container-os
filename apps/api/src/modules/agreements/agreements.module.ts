import { Module } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AgreementsController],
  providers: [AgreementsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [AgreementsService],
})
export class AgreementsModule {}
