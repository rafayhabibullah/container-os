import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { BillingService } from './billing.service';
import { MandateService } from './mandate.service';

@ApiTags('operator', 'tenant')
@Controller()
export class BillingController {
  constructor(private billing: BillingService, private mandate: MandateService) {}

  @Get('operator/v1/invoices/:invoiceId')
  @UseGuards(JwtAuthGuard)
  getInvoice(@Param('invoiceId') id: string) { return this.billing.getInvoice(id); }

  @Post('tenant/v1/mandates')
  @UseGuards(JwtAuthGuard)
  createMandate(@Body() body: { customerId: string; scheme: string; ibanLast4?: string; stripeSetupId?: string }) {
    return this.mandate.createMandate(body.customerId, body.scheme, body.ibanLast4, 'checkout', body.stripeSetupId);
  }

  @Get('tenant/v1/billing')
  @UseGuards(JwtAuthGuard)
  getTenantBilling() { return { invoices: [], mandates: [] }; }
}
