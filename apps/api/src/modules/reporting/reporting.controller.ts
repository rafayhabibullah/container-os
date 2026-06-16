import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { ReportingService } from './reporting.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { PlanFeatureGuard } from '../organisations/plan-feature.guard';
import { RequirePlanFeature } from '../organisations/require-plan-feature.decorator';

@ApiTags('operator')
@Controller('v1/organisations/:organisationId/reports')
@RequirePlanFeature('reporting')
@UseGuards(JwtAuthGuard, OrganisationGuard, PlanFeatureGuard)
export class ReportingController {
  constructor(private reporting: ReportingService) {}

  @Get('executive')
  getExecutive(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getExecutiveReport(orgId, query.from, query.to, query.siteId);
  }

  @Get('occupancy')
  getOccupancy(@Param('organisationId') orgId: string) {
    return this.reporting.getOccupancyReport(orgId);
  }

  @Get('revenue')
  getRevenue(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getRevenueReport(orgId, query.from, query.to);
  }

  @Get('delinquency')
  getDelinquency(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getDelinquencyReport(orgId, query.from, query.to);
  }

  @Get('churn')
  getChurn(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getChurnReport(orgId, query.from, query.to);
  }

  @Get('lead-conversion')
  getLeadConversion(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getLeadConversionReport(orgId, query.from, query.to);
  }

  @Get('mandate-status')
  getMandateStatus(@Param('organisationId') orgId: string) {
    return this.reporting.getMandateStatusReport(orgId);
  }

  @Get('inspections')
  getInspections(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getInspectionsReport(orgId, query.from, query.to);
  }

  @Get('operations')
  getOperations(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getOperationsReport(orgId, query.from, query.to);
  }

  @Get('payments')
  getPayments(@Param('organisationId') orgId: string, @Query() query: ReportQueryDto) {
    return this.reporting.getPaymentsReport(orgId, query.from, query.to);
  }
}
