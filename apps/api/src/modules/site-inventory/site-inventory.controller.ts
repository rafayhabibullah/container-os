import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { SiteGuard } from '../../common/guards/site.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SiteInventoryService } from './site-inventory.service';
import { AvailabilityService } from './availability.service';

@Controller()
export class SiteInventoryController {
  constructor(private siteInventory: SiteInventoryService, private availability: AvailabilityService) {}

  @Get('public/v1/sites')
  getSites() { return this.siteInventory.getSites(); }

  @Get('public/v1/sites/:slug/availability')
  getAvailability(@Param('slug') slug: string, @Query('startDate') startDate?: string) {
    return this.availability.getAvailability(slug, startDate ? new Date(startDate) : new Date());
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
}
