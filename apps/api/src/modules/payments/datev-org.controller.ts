import { Controller, Get, Optional, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { PrismaClient } from '@prisma/client';
import { DatevExportService } from './datev-export.service';
import { AccountingValidationService } from './accounting-validation.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class DatevOrgController {
  constructor(
    private readonly datevExport: DatevExportService,
    private readonly prisma: PrismaClient,
    @Optional() private readonly accountingValidation?: AccountingValidationService,
  ) {}

  @Post('export/datev')
  @ApiOperation({ summary: 'Queue and run DATEV CSV export; returns { jobId, downloadUrl }' })
  async exportDatev(
    @Param('organisationId') _orgId: string,
    @Body() body: { siteIds: string[]; from: string; to: string },
  ) {
    const from = new Date(body.from);
    const to = new Date(body.to);
    const job = await this.prisma.exportJob.create({
      data: { kind: 'datev', scope: { siteIds: body.siteIds, from: body.from, to: body.to }, status: 'queued' },
    });
    const result = await this.datevExport.runExport(body.siteIds, from, to);
    await this.prisma.exportJob.update({ where: { id: job.id }, data: { status: 'done', downloadUrl: result.downloadUrl, completedAt: new Date() } });
    return { jobId: job.id, downloadUrl: result.downloadUrl };
  }

  @Get('export/:jobId')
  @ApiOperation({ summary: 'Poll export job status and downloadUrl' })
  getExportJob(
    @Param('organisationId') _orgId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.prisma.exportJob.findUniqueOrThrow({ where: { id: jobId } });
  }

  @Post('accounting/validate')
  @ApiOperation({ summary: 'Validate German invoice/DATEV/ZUGFeRD readiness for an organisation' })
  validateAccounting(
    @Param('organisationId') orgId: string,
    @Body() body: { from?: string; to?: string },
  ) {
    if (!this.accountingValidation) throw new Error('Accounting validation is not configured');
    return this.accountingValidation.validateOrganisation(
      orgId,
      body.from ? new Date(body.from) : undefined,
      body.to ? new Date(body.to) : undefined,
    );
  }

  @Get('accounting/validation-runs')
  @ApiOperation({ summary: 'List recent accounting validation runs' })
  validationRuns(@Param('organisationId') orgId: string) {
    return (this.prisma as any).accountingValidationRun.findMany({
      where: { organisationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  }
}
