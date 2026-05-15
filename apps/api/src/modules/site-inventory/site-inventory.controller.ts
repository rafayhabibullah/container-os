import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { SiteGuard } from '../../common/guards/site.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SiteInventoryService } from './site-inventory.service';
import { AvailabilityService } from './availability.service';

@ApiTags('public', 'operator')
@Controller()
export class SiteInventoryController {
  constructor(private siteInventory: SiteInventoryService, private availability: AvailabilityService, private prisma: PrismaClient) {}

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
  async searchListings(
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('minSizeSqm') minSizeSqm?: string,
    @Query('maxSizeSqm') maxSizeSqm?: string,
    @Query('bookingMode') bookingMode?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.prisma.listing.findMany({
      where: {
        status: 'published',
        ...(bookingMode ? { bookingMode: bookingMode as 'approval_required' | 'instant_booking' | 'request_price' } : {}),
        site: {
          ...(city ? { address: { path: ['city'], string_contains: city } } : {}),
          ...(country ? { address: { path: ['country'], string_contains: country } } : {}),
        },
        ...(minSizeSqm || maxSizeSqm
          ? {
              unit: {
                unitType: {
                  sizeSqm: {
                    ...(minSizeSqm ? { gte: parseFloat(minSizeSqm) } : {}),
                    ...(maxSizeSqm ? { lte: parseFloat(maxSizeSqm) } : {}),
                  },
                },
              },
            }
          : {}),
      },
      include: {
        site: { select: { name: true, slug: true, address: true } },
        unit: { select: { unitCode: true, unitType: { select: { sizeSqm: true, name: true } } } },
      },
      take: limit ? parseInt(limit, 10) : 20,
      skip: offset ? parseInt(offset, 10) : 0,
      orderBy: { createdAt: 'desc' },
    });
  }
}
