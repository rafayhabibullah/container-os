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
    const { unitId, title, description, publicPriceMinor, showPrice, depositMinor, availableFrom,
            bookingMode, requiredDocs, seoTitle, seoDescription } = dto;
    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        ...(unitId !== undefined && { unitId }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(publicPriceMinor !== undefined && { publicPriceMinor }),
        ...(showPrice !== undefined && { showPrice }),
        ...(depositMinor !== undefined && { depositMinor }),
        ...(availableFrom !== undefined && { availableFrom: availableFrom ? new Date(availableFrom) : null }),
        ...(bookingMode !== undefined && { bookingMode }),
        ...(requiredDocs !== undefined && { requiredDocs }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
      },
    });
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

  searchPublicListings(filters: {
    q?: string;
    city?: string;
    country?: string;
    minSizeSqm?: string;
    maxSizeSqm?: string;
    bookingMode?: string;
    limit?: string;
    offset?: string;
  }) {
    const MAX_LIMIT = 100;
    const take = Math.min(filters.limit ? parseInt(filters.limit, 10) : 20, MAX_LIMIT);
    const skip = filters.offset ? parseInt(filters.offset, 10) : 0;
    if (isNaN(take) || isNaN(skip)) throw new Error('Invalid pagination params');

    const bookingModeValues = ['approval_required', 'instant_booking', 'request_price'];
    if (filters.bookingMode && !bookingModeValues.includes(filters.bookingMode)) {
      throw new Error('Invalid bookingMode');
    }

    return this.prisma.listing.findMany({
      where: {
        status: 'published',
        ...(filters.q ? { OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { description: { contains: filters.q, mode: 'insensitive' } },
        ] } : {}),
        ...(filters.bookingMode ? { bookingMode: filters.bookingMode as 'approval_required' | 'instant_booking' | 'request_price' } : {}),
        ...(filters.city || filters.country ? {
          site: {
            ...(filters.city ? { address: { path: ['city'], equals: filters.city } } : {}),
            ...(filters.country ? { address: { path: ['country'], equals: filters.country } } : {}),
          },
        } : {}),
        ...(filters.minSizeSqm || filters.maxSizeSqm ? {
          unit: {
            unitType: {
              sizeSqm: {
                ...(filters.minSizeSqm ? { gte: parseFloat(filters.minSizeSqm) } : {}),
                ...(filters.maxSizeSqm ? { lte: parseFloat(filters.maxSizeSqm) } : {}),
              },
            },
          },
        } : {}),
      },
      include: {
        site: { select: { name: true, slug: true, address: true } },
        unit: { select: { unitCode: true, unitType: { select: { sizeSqm: true, name: true } } } },
      },
      take,
      skip,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertOwnership(organisationId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, organisationId } });
    if (!listing) throw new NotFoundException('Listing not found');
  }
}
