import { Controller, Post, Headers, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

/**
 * Mirrors MollieWebhookController. Stripe is the dormant/alt-rail provider
 * (Mollie is the default EU/SEPA provider per PAYMENT_PROVIDER). This
 * controller is always registered so Stripe webhook traffic can be received
 * regardless of which adapter is active, but only the configured provider's
 * webhook is expected to drive real payment state changes.
 */
@ApiTags('system')
@Controller('v1/webhooks')
export class StripeWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('stripe')
  async handleStripeWebhook(@Request() req: any, @Headers('stripe-signature') signature: string) {
    return this.payments.handleStripeWebhook(req.rawBody ?? Buffer.from(''), signature);
  }
}
