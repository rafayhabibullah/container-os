import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { QuoteService } from './quote.service';
import { PricingService } from './pricing.service';

@Controller()
export class PricingController {
  constructor(private quoteService: QuoteService, private pricingService: PricingService) {}

  @Get('public/v1/quotes')
  getQuote(@Query('siteId') siteId: string, @Query('unitTypeId') unitTypeId: string, @Query('startDate') startDate: string, @Query('customerType') customerType: string = 'private', @Query('promoCode') promoCode?: string) {
    return this.quoteService.calculateQuote({ siteId, unitTypeId, startDate: new Date(startDate), customerType, promoCode });
  }

  @Post('operator/v1/price-books')
  @UseGuards(JwtAuthGuard)
  createPriceBook(@Body() body: { siteId: string; name: string; effectiveFrom: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.pricingService.createPriceBook(body.siteId, body.name, new Date(body.effectiveFrom), user.id);
  }

  @Post('operator/v1/price-books/:id/publish')
  @UseGuards(JwtAuthGuard)
  publishPriceBook(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pricingService.publishPriceBook(id, user.id);
  }

  @Post('operator/v1/price-books/:id/rules')
  @UseGuards(JwtAuthGuard)
  addRule(@Param('id') priceBookId: string, @Body() body: { unitTypeId: string; amountMinor: number; billingCycle: string }) {
    return this.pricingService.addRateRule(priceBookId, body.unitTypeId, body.amountMinor, body.billingCycle);
  }
}
