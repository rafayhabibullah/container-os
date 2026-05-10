import { ApiTags } from '@nestjs/swagger';
import { Controller, Post, Body } from '@nestjs/common';
import { StorefrontService } from './storefront.service';

@ApiTags('public')
@Controller('public/v1')
export class StorefrontController {
  constructor(private storefront: StorefrontService) {}

  @Post('checkout-sessions')
  createCheckoutSession(@Body() body: { siteId: string; unitTypeId: string; startDate: string }) {
    return this.storefront.createCheckoutSession(body.siteId, body.unitTypeId, new Date(body.startDate));
  }

  @Post('quote-requests')
  createQuoteRequest(@Body() body: { siteId: string; contact: object; requirements?: object }) {
    return this.storefront.createQuoteRequest(body.siteId, body.contact, body.requirements);
  }
}
