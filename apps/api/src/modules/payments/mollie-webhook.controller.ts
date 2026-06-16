import { Controller, Post, Body, Optional } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { MollieAdapter } from './mollie.adapter';
import { DelinquencyService } from '../billing/delinquency.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('webhooks')
@Controller('v1/webhooks')
export class MollieWebhookController {
  constructor(
    private readonly mollie: MollieAdapter,
    private readonly prisma: PrismaClient,
    private readonly delinquency: DelinquencyService,
    @Optional() private readonly subscriptions?: SubscriptionsService,
  ) {}

  @Post('mollie')
  async handleMollieWebhook(@Body() body: { id: string }) {
    const molliePaymentId = body.id;
    if (!molliePaymentId) return { received: true };

    const attempt = await this.prisma.paymentAttempt.findFirst({ where: { providerRef: molliePaymentId } });
    if (!attempt) {
      await this.subscriptions?.handlePaymentWebhook(molliePaymentId);
      return { received: true };
    }

    const mollieStatus = await this.mollie.getPaymentStatus(molliePaymentId);
    const mappedStatus = this.mollie.mapMollieStatus(mollieStatus);

    await this.prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: mappedStatus } });
    await this.prisma.payment.update({ where: { id: attempt.paymentId }, data: { status: mappedStatus } });

    if (mappedStatus === 'succeeded') {
      const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: attempt.paymentId } });
      const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
      await this.prisma.ledgerEntry.create({
        data: {
          type: 'invoice_payment',
          refType: 'Payment',
          refId: payment.id,
          debitAccount: '1200',
          creditAccount: '8400',
          amountMinor: payment.amountMinor,
          siteId: invoice.siteId,
        },
      });
      await this.delinquency.markPaid(payment.invoiceId);
    }

    return { received: true };
  }
}
