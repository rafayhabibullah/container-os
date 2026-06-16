import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { OrganisationPaymentService } from './organisation-payment.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/payment-account')
export class OrganisationPaymentController {
  constructor(private readonly payments: OrganisationPaymentService) {}

  @Get()
  get(@Param('organisationId') organisationId: string) {
    return this.payments.getAccount(organisationId);
  }

  @Post('mollie/onboarding')
  start(@Param('organisationId') organisationId: string, @Body() body: { returnUrl?: string }) {
    return this.payments.startMollieOnboarding(organisationId, body.returnUrl);
  }

  @Post('mollie/complete')
  complete(@Param('organisationId') organisationId: string, @Body() body: { providerAccountId?: string; capabilities?: object }) {
    return this.payments.completeMollieOnboarding(organisationId, body.providerAccountId, body.capabilities);
  }
}
