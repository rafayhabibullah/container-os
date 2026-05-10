import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Param, Body, Query, Request, Headers, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { PaymentsService } from './payments.service';
import { LedgerService } from './ledger.service';
import { DatevExportService } from './datev-export.service';

@ApiTags('operator', 'tenant', 'system')
@Controller()
export class PaymentsController {
  constructor(private payments: PaymentsService, private ledger: LedgerService, private datevExport: DatevExportService) {}

  @Post('tenant/v1/payments/intents')
  @UseGuards(JwtAuthGuard)
  chargeInvoice(@Body() body: { invoiceId: string }) { return this.payments.chargeInvoice(body.invoiceId); }

  @Post('system/v1/payments/webhooks/stripe')
  handleWebhook(@Request() req: any, @Headers('stripe-signature') sig: string) { return this.payments.handleStripeWebhook(req.rawBody ?? Buffer.from(''), sig); }

  @Get('operator/v1/ledger')
  @UseGuards(JwtAuthGuard)
  getLedger(@Query('siteId') siteId: string, @Query('from') from?: string, @Query('to') to?: string) { return this.ledger.getLedger(siteId, from ? new Date(from) : undefined, to ? new Date(to) : undefined); }

  @Post('operator/v1/exports/datev')
  @UseGuards(JwtAuthGuard)
  exportDatev(@Body() body: { siteIds: string[]; from: string; to: string }) { return this.datevExport.runExport(body.siteIds, new Date(body.from), new Date(body.to)); }

  @Get('operator/v1/exports/:exportId')
  @UseGuards(JwtAuthGuard)
  getExport(@Param('exportId') exportId: string) { return { exportId, status: 'completed' }; }
}
