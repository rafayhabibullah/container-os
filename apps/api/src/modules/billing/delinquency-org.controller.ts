import { Controller, Get, Put, Post, Param, Body, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { PrismaClient } from '@prisma/client';
import { DelinquencyService } from './delinquency.service';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class DelinquencyOrgController {
  constructor(
    private readonly delinquency: DelinquencyService,
    private readonly prisma: PrismaClient,
  ) {}

  @Get('sites/:siteId/delinquency-policy')
  @ApiOperation({ summary: 'Get delinquency policy for a site' })
  getPolicy(
    @Param('organisationId') _orgId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.prisma.delinquencyPolicy.findFirst({ where: { siteId } });
  }

  @Put('sites/:siteId/delinquency-policy')
  @ApiOperation({ summary: 'Upsert delinquency policy for a site (owner only)' })
  updatePolicy(
    @Param('organisationId') _orgId: string,
    @Param('siteId') siteId: string,
    @Body() body: { overdueDays?: number; lockoutEnabled?: boolean; lateFeeRules?: object },
  ) {
    return this.prisma.delinquencyPolicy.upsert({
      where: { siteId },
      create: { siteId, overdueDays: body.overdueDays ?? 14, lockoutEnabled: body.lockoutEnabled ?? true, lateFeeRules: body.lateFeeRules ?? {} },
      update: { overdueDays: body.overdueDays, lockoutEnabled: body.lockoutEnabled, lateFeeRules: body.lateFeeRules },
    });
  }

  @Post('billing/run-delinquency')
  @ApiOperation({ summary: 'Run delinquency check for a site (owner only)' })
  async runDelinquency(
    @Param('organisationId') _orgId: string,
    @Req() req: { body: { siteId: string } },
    @CurrentMember() member: MemberContext,
  ) {
    if (member.role !== 'owner') throw new ForbiddenException('Only owners can trigger delinquency runs');
    const siteId = req.body.siteId;
    await this.delinquency.checkOverdueInvoices(siteId);
    return { ok: true, siteId };
  }
}
