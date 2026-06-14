import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { GdprService } from './gdpr.service';
import { AuditController } from './audit.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    GdprService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [AuditService, GdprService],
})
export class AuditModule {}
