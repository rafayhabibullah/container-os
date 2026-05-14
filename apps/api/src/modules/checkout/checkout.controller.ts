import { ApiTags } from '@nestjs/swagger';
import { Controller, Post, Param, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

@ApiTags('public')
@Controller('public/v1/checkout')
export class CheckoutController {
  constructor(private checkout: CheckoutService) {}

  @Post(':sessionId/confirm')
  confirmCheckout(
    @Param('sessionId') sessionId: string,
    @Body() body: { name: string; email: string; phone: string; marketingConsent: boolean },
  ) {
    return this.checkout.confirmCheckout(sessionId, body);
  }
}
