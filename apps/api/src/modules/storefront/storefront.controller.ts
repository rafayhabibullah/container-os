import { ApiTags } from '@nestjs/swagger';
import { Controller, Post, Body } from '@nestjs/common';
import { StorefrontService } from './storefront.service';

@ApiTags('public')
@Controller('public/v1')
export class StorefrontController {
  constructor(private storefront: StorefrontService) {}

  @Post('checkout-sessions')
  createCheckoutSession(@Body() body: { siteId?: string; unitTypeId?: string; listingId?: string; listingSlug?: string; startDate: string }) {
    return this.storefront.createCheckoutSession({
      siteId: body.siteId,
      unitTypeId: body.unitTypeId,
      listingId: body.listingId,
      listingSlug: body.listingSlug,
      startDate: new Date(body.startDate),
    });
  }

  @Post('quote-requests')
  createQuoteRequest(@Body() body: { siteId: string; contact: object; requirements?: object }) {
    return this.storefront.createQuoteRequest(body.siteId, body.contact, body.requirements);
  }

  @Post('saved-searches')
  createSavedSearch(@Body() body: { email: string; city?: string; query?: string; locale?: string; filters?: Record<string, unknown> }) {
    return this.storefront.createSavedSearch(body);
  }

  @Post('marketplace/reviews')
  createReview(@Body() body: { listingId: string; rating: number; title?: string; body?: string; reviewerName?: string; reviewerEmail?: string }) {
    return this.storefront.createMarketplaceReview(body);
  }

  @Post('marketplace/events')
  recordEvent(@Body() body: { listingId?: string; eventType: string; source?: string; sessionId?: string; metadata?: Record<string, unknown> }) {
    return this.storefront.recordMarketplaceEvent(body);
  }
}
