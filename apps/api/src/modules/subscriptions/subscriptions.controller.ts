import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import { OrgPlan } from '@prisma/client';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  current(@Param('organisationId') organisationId: string) {
    return this.subscriptions.getCurrent(organisationId);
  }

  @Get('plans')
  plans() {
    return this.subscriptions.getPlans();
  }

  @Post('change-plan')
  changePlan(@Param('organisationId') organisationId: string, @Body() body: { plan: OrgPlan; billingInterval?: string }) {
    return this.subscriptions.changePlan(organisationId, body.plan, body.billingInterval);
  }

  @Post('checkout')
  checkout(@Param('organisationId') organisationId: string, @Body() body: { plan: OrgPlan; billingInterval?: string; redirectUrl?: string }) {
    return this.subscriptions.createCheckout(organisationId, body.plan, body.billingInterval, body.redirectUrl);
  }

  @Post('reconcile-checkout')
  reconcileCheckout(@Param('organisationId') organisationId: string) {
    return this.subscriptions.reconcileCheckout(organisationId);
  }

  @Get('commissions')
  commissions(@Param('organisationId') organisationId: string) {
    return this.subscriptions.listCommissions(organisationId);
  }

  @Get('invoices')
  invoices(@Param('organisationId') organisationId: string) {
    return this.subscriptions.listInvoices(organisationId);
  }

  @Get('overview')
  overview(@Param('organisationId') organisationId: string) {
    return this.subscriptions.getBillingOverview(organisationId);
  }

  @Get('invoices/:invoiceId')
  invoice(@Param('organisationId') organisationId: string, @Param('invoiceId') invoiceId: string) {
    return this.subscriptions.getInvoice(organisationId, invoiceId);
  }

  @Get('invoices/:invoiceId/pdf')
  async invoicePdf(
    @Param('organisationId') organisationId: string,
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.subscriptions.generateInvoicePdf(organisationId, invoiceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.fileName}"`);
    res.send(pdf.buffer);
  }
}
