import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { ReportingService } from './reporting.service';

@ApiTags('operator')
@Controller('v1/organisations/:organisationId/reports')
@UseGuards(JwtAuthGuard, OrganisationGuard)
export class ReportingController {
  constructor(private reporting: ReportingService) {}

  @Get('occupancy')
  getOccupancy(@Param('organisationId') orgId: string) {
    return this.reporting.getOccupancyReport(orgId);
  }

  @Get('revenue')
  getRevenue(@Param('organisationId') orgId: string) {
    return this.reporting.getRevenueReport(orgId);
  }
}
