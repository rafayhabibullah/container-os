import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { MandateService } from './mandate.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class MandateOrgController {
  constructor(private readonly mandate: MandateService) {}

  @Post('customers/:customerId/mandates')
  @ApiOperation({ summary: 'Create a payment mandate for a customer' })
  createMandate(
    @Param('organisationId') _orgId: string,
    @Param('customerId') customerId: string,
    @Body() body: { scheme: string; ibanLast4?: string; stripeSetupId?: string },
  ) {
    return this.mandate.createMandate(customerId, body.scheme, body.ibanLast4, 'operator', body.stripeSetupId);
  }

  @Get('customers/:customerId/mandates')
  @ApiOperation({ summary: 'List payment mandates for a customer' })
  listMandates(
    @Param('organisationId') _orgId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.mandate.listMandates(customerId);
  }
}
