import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { AccessControlController } from './access-control.controller';
import { StubAccessAdapter } from './adapters/stub.adapter';
import { ACCESS_VENDOR_ADAPTER } from './adapters/access-vendor.adapter';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AccessControlController],
  providers: [AccessControlService, { provide: PrismaClient, useValue: new PrismaClient() }, { provide: ACCESS_VENDOR_ADAPTER, useClass: StubAccessAdapter }],
  exports: [AccessControlService],
})
export class AccessControlModule {}
