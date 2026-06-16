import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';
import { OrganisationModule } from '../organisations/organisations.module';

@Module({
  imports: [AuthModule, OrganisationModule],
  controllers: [ReportingController],
  providers: [ReportingService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [ReportingService],
})
export class ReportingModule {}
