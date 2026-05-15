import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaClient) {}

  async createListing(organisationId: string, dto: CreateListingDto) {
    const base = slugify(dto.title);
    const slug = `${base}-${Date.now()}`;
    return this.prisma.listing.create({
      data: {
        organisationId,
        siteId: dto.siteId,
        unitId: dto.unitId,
        slug,
        title: dto.title,
        description: dto.description,
        publicPriceMinor: dto.publicPriceMinor,
        showPrice: dto.showPrice ?? true,
        depositMinor: dto.depositMinor,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
        bookingMode: dto.bookingMode,
        requiredDocs: dto.requiredDocs ?? [],
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        status: 'draft',
        source: 'manual',
        commissionRateBp: 0,
      },
    });
  }

  listListings(organisationId: string) {
    return this.prisma.listing.findMany({
      where: { organisationId },
      include: { site: { select: { name: true } }, unit: { select: { unitCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateListing(organisationId: string, listingId: string, dto: UpdateListingDto) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: dto as object });
  }

  async publishListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'published' } });
  }

  async pauseListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'paused' } });
  }

  async archiveListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'archived' } });
  }

  private async assertOwnership(organisationId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, organisationId } });
    if (!listing) throw new NotFoundException('Listing not found');
  }
}
