import { Module } from '@nestjs/common';
import { TenantPortalService } from './tenant-portal.service';
import { TenantPortalController } from './tenant-portal.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [TenantPortalService],
})
export class TenantPortalModule {}
