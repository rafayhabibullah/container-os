import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@ApiTags('listings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

  @Get()
  list(@Param('organisationId') orgId: string) {
    return this.listings.listListings(orgId);
  }

  @Post()
  create(@Param('organisationId') orgId: string, @Body() dto: CreateListingDto) {
    return this.listings.createListing(orgId, dto);
  }

  @Patch(':listingId')
  update(
    @Param('organisationId') orgId: string,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.updateListing(orgId, listingId, dto);
  }

  @Post(':listingId/publish')
  publish(@Param('organisationId') orgId: string, @Param('listingId') listingId: string) {
    return this.listings.publishListing(orgId, listingId);
  }

  @Post(':listingId/pause')
  pause(@Param('organisationId') orgId: string, @Param('listingId') listingId: string) {
    return this.listings.pauseListing(orgId, listingId);
  }

  @Post(':listingId/archive')
  archive(@Param('organisationId') orgId: string, @Param('listingId') listingId: string) {
    return this.listings.archiveListing(orgId, listingId);
  }

  @Post(':listingId/images')
  addImage(
    @Param('organisationId') orgId: string,
    @Param('listingId') listingId: string,
    @Body() body: { data: string; contentType: string },
  ) {
    return this.listings.addImage(orgId, listingId, body.data, body.contentType);
  }

  @Post(':listingId/images/remove')
  removeImage(
    @Param('organisationId') orgId: string,
    @Param('listingId') listingId: string,
    @Body() body: { url: string },
  ) {
    return this.listings.removeImage(orgId, listingId, body.url);
  }
}
