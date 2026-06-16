import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { SiteGuard } from '../../common/guards/site.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SiteInventoryService } from './site-inventory.service';
import { AvailabilityService } from './availability.service';
import { ListingsService } from '../listings/listings.service';

@ApiTags('public', 'operator')
@Controller()
export class SiteInventoryController {
  constructor(private siteInventory: SiteInventoryService, private availability: AvailabilityService, private listingsService: ListingsService) {}

  @Get('public/v1/sites')
  getSites() { return this.siteInventory.getSites(); }

  @Get('public/v1/sites/:slug/availability')
  async getAvailability(@Param('slug') slug: string, @Query('startDate') startDate?: string) {
    // Resolve slug → siteId before querying units
    const site = await this.siteInventory.getSiteBySlug(slug);
    if (!site) return [];
    return this.availability.getAvailability(site.id, startDate ? new Date(startDate) : new Date());
  }

  @Post('operator/v1/sites/:siteId/units')
  @UseGuards(JwtAuthGuard, SiteGuard)
  createUnit(@Param('siteId') siteId: string, @Body() body: { unitCode: string; unitTypeId: string; kind: string; driveUp?: boolean }) {
    return this.siteInventory.createUnit({ ...body, siteId, driveUp: body.driveUp ?? false });
  }

  @Get('operator/v1/units')
  @UseGuards(JwtAuthGuard)
  getUnits(@Query('siteId') siteId: string) { return this.siteInventory.getUnits(siteId); }

  @Post('operator/v1/units/:unitId/status-transition')
  @UseGuards(JwtAuthGuard)
  transitionStatus(@Param('unitId') unitId: string, @Body() body: { to: string; reason: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.siteInventory.transitionUnitStatus(unitId, body.to, user.id, body.reason);
  }

  @Get('public/v1/listings')
  searchListings(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('minPriceMinor') minPriceMinor?: string,
    @Query('maxPriceMinor') maxPriceMinor?: string,
    @Query('minSizeSqm') minSizeSqm?: string,
    @Query('maxSizeSqm') maxSizeSqm?: string,
    @Query('bookingMode') bookingMode?: string,
    @Query('feature') feature?: string | string[],
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      return this.listingsService.searchPublicListings({ q, city, country, minPriceMinor, maxPriceMinor, minSizeSqm, maxSizeSqm, bookingMode, feature, sort, limit, offset });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bad request';
      throw new BadRequestException(message);
    }
  }

  @Get('public/v1/listings/:slug')
  getPublicListing(@Param('slug') slug: string) {
    return this.listingsService.getPublicListingBySlug(slug);
  }
}
