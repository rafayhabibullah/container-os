import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { BillingService } from './billing.service';
import { InvoiceRunService } from './invoice-run.service';
import { MollieAdapter } from '../payments/mollie.adapter';
import { PrismaClient } from '@prisma/client';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class BillingOrgController {
  constructor(
    private readonly billing: BillingService,
    private readonly invoiceRun: InvoiceRunService,
    private readonly mollie: MollieAdapter,
    private readonly prisma: PrismaClient,
  ) {}

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices (filter by siteId, agreementId, status)' })
  listInvoices(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('agreementId') agreementId?: string,
    @Query('status') status?: string,
  ) {
    return this.billing.listInvoicesForOrg(orgId, { siteId, agreementId, status });
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice detail with lines, payments, credit notes' })
  getInvoice(
    @Param('organisationId') _orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.billing.getInvoiceDetail(invoiceId);
  }

  @Post('invoices/run')
  @ApiOperation({ summary: 'Trigger invoice run for a site (owner only)' })
  async runInvoices(
    @Param('organisationId') orgId: string,
    @CurrentMember() member: MemberContext,
  ) {
    if (member.role !== 'owner') throw new ForbiddenException('Only owners can trigger invoice runs');
    return this.invoiceRun.runForDate(new Date(), orgId);
  }

  @Post('invoices/:invoiceId/void')
  @ApiOperation({ summary: 'Void an invoice and create credit note' })
  voidInvoice(
    @Param('organisationId') _orgId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { reason: string },
  ) {
    return this.billing.voidInvoice(invoiceId, body.reason ?? 'Voided by operator');
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments for all sites in organisation' })
  async listPayments(@Param('organisationId') orgId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    return this.prisma.payment.findMany({
      where: { invoice: { agreement: { siteId: { in: siteIds } } } },
      include: { invoice: { select: { id: true, currency: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post('invoices/:invoiceId/pay')
  @ApiOperation({ summary: 'Create Mollie payment link for invoice' })
  payInvoice(
    @Param('organisationId') orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    const redirectUrl = `${process.env.APP_URL ?? 'https://app.sitelager.io'}/invoices/${invoiceId}`;
    return this.billing.createMolliePayment(invoiceId, this.mollie, redirectUrl);
  }
}
