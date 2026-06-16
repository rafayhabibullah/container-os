import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrgPlan } from '@prisma/client';
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
}
