import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { OrganisationService } from './organisations.service';
import { SiteService } from './sites.service';
import { TeamService } from './team.service';
import { OrganisationController } from './organisations.controller';

@Module({
  imports: [AuthModule],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    OrganisationService,
    SiteService,
    TeamService,
  ],
  controllers: [OrganisationController],
  exports: [OrganisationService, SiteService, TeamService],
})
export class OrganisationModule {}
