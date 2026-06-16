import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { StorageService } from '../documents/storage.service';
import * as crypto from 'crypto';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaClient, private storage: StorageService) {}

  private listingQuality(listing: {
    title?: string | null;
    description?: string | null;
    publicPriceMinor?: number | null;
    showPrice?: boolean;
    depositMinor?: number | null;
    bookingMode?: string;
    images?: string[];
    seoTitle?: string | null;
    seoDescription?: string | null;
    requiredDocs?: string[];
    site?: { address?: unknown } | null;
    unit?: { status?: string; unitType?: { sizeSqm?: number | null; features?: string[] | null } | null } | null;
  }) {
    const address = (listing.site?.address ?? {}) as { city?: string; postalCode?: string; street?: string; country?: string };
    const checks = [
      { key: 'title', ok: Boolean(listing.title && listing.title.trim().length >= 8), points: 10, label: 'Title must be at least 8 characters' },
      { key: 'description', ok: Boolean(listing.description && listing.description.trim().length >= 80), points: 15, label: 'Description must be at least 80 characters' },
      { key: 'image', ok: Boolean(listing.images?.length), points: 15, label: 'At least one public photo is required' },
      { key: 'price', ok: listing.bookingMode === 'request_price' || listing.showPrice === false || listing.publicPriceMinor != null, points: 15, label: 'Public monthly price is required unless price is on request' },
      { key: 'deposit', ok: listing.depositMinor != null || listing.bookingMode === 'request_price', points: 5, label: 'Deposit must be set unless price is on request' },
      { key: 'location', ok: Boolean(address.city && address.postalCode), points: 10, label: 'City and postal code are required' },
      { key: 'unit', ok: Boolean(listing.unit?.status === 'available' && listing.unit?.unitType?.sizeSqm), points: 15, label: 'Listing must point to an available unit with a size' },
      { key: 'features', ok: Boolean(listing.unit?.unitType?.features?.length), points: 5, label: 'At least one unit feature is recommended' },
      { key: 'seo', ok: Boolean(listing.seoTitle && listing.seoDescription), points: 5, label: 'SEO title and description are recommended' },
      { key: 'booking', ok: Boolean(listing.bookingMode), points: 5, label: 'Booking mode must be selected' },
    ];
    const score = checks.reduce((sum, check) => sum + (check.ok ? check.points : 0), 0);
    return { score, missing: checks.filter((check) => !check.ok).map((check) => ({ key: check.key, label: check.label })) };
  }

  private attachMarketplaceStats<T extends { marketplaceReviews?: { rating: number; title?: string | null; body?: string | null; reviewerName?: string | null; createdAt?: Date }[] }>(listing: T) {
    const reviews = listing.marketplaceReviews ?? [];
    const reviewCount = reviews.length;
    const ratingAverage = reviewCount ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1)) : null;
    return { ...listing, reviewCount, ratingAverage };
  }

  async addImage(organisationId: string, listingId: string, base64Data: string, contentType: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, organisationId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(contentType)) throw new BadRequestException('Unsupported image type');

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 5 * 1024 * 1024) throw new BadRequestException('Image too large (max 5MB)');

    const ext = contentType.split('/')[1].replace('jpeg', 'jpg');
    const key = `listings/${listingId}/${crypto.randomUUID()}.${ext}`;
    await this.storage.uploadPublic(key, buffer, contentType);
    const url = this.storage.getPublicUrl(key);

    const images = [...listing.images, url];
    return this.prisma.listing.update({ where: { id: listingId }, data: { images } });
  }

  async removeImage(organisationId: string, listingId: string, imageUrl: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, organisationId } });
    if (!listing) throw new NotFoundException('Listing not found');
    const images = listing.images.filter((img) => img !== imageUrl);
    return this.prisma.listing.update({ where: { id: listingId }, data: { images } });
  }

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
            bookingMode, requiredDocs, images, seoTitle, seoDescription } = dto;
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
        ...(images !== undefined && { images }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
      },
    });
  }

  async publishListing(organisationId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, organisationId },
      include: {
        site: { select: { address: true } },
        unit: { select: { status: true, unitType: { select: { sizeSqm: true, features: true } } } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    const quality = this.listingQuality(listing);
    if (quality.score < 80 || quality.missing.some((item) => ['title', 'description', 'image', 'price', 'location', 'unit'].includes(item.key))) {
      throw new BadRequestException({ message: 'Listing is not ready to publish', score: quality.score, missing: quality.missing });
    }
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'published' } });
  }

  async getListingCompleteness(organisationId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, organisationId },
      include: {
        site: { select: { address: true } },
        unit: { select: { status: true, unitType: { select: { sizeSqm: true, features: true } } } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.listingQuality(listing);
  }

  async pauseListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'paused' } });
  }

  async archiveListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'archived' } });
  }

  async searchPublicListings(filters: {
    q?: string;
    city?: string;
    country?: string;
    minPriceMinor?: string;
    maxPriceMinor?: string;
    minSizeSqm?: string;
    maxSizeSqm?: string;
    bookingMode?: string;
    feature?: string | string[];
    sort?: string;
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

    const orderBy =
      filters.sort === 'price_asc' ? { publicPriceMinor: 'asc' as const } :
      filters.sort === 'price_desc' ? { publicPriceMinor: 'desc' as const } :
      { createdAt: 'desc' as const };
    const featureValues = Array.isArray(filters.feature) ? filters.feature : filters.feature ? [filters.feature] : [];
    const unitTypeFilter = {
      ...(filters.minSizeSqm || filters.maxSizeSqm ? {
        sizeSqm: {
          ...(filters.minSizeSqm ? { gte: parseFloat(filters.minSizeSqm) } : {}),
          ...(filters.maxSizeSqm ? { lte: parseFloat(filters.maxSizeSqm) } : {}),
        },
      } : {}),
      ...(featureValues.length ? { features: { hasEvery: featureValues } } : {}),
    };

    const listings = await this.prisma.listing.findMany({
      where: {
        status: 'published',
        unit: {
          status: 'available',
          deletedAt: null,
          ...(Object.keys(unitTypeFilter).length ? { unitType: unitTypeFilter } : {}),
        },
        ...(filters.q ? { OR: [
          { title: { contains: filters.q, mode: 'insensitive' } },
          { description: { contains: filters.q, mode: 'insensitive' } },
        ] } : {}),
        ...(filters.bookingMode ? { bookingMode: filters.bookingMode as 'approval_required' | 'instant_booking' | 'request_price' } : {}),
        ...(filters.minPriceMinor || filters.maxPriceMinor ? {
          publicPriceMinor: {
            ...(filters.minPriceMinor ? { gte: parseInt(filters.minPriceMinor, 10) } : {}),
            ...(filters.maxPriceMinor ? { lte: parseInt(filters.maxPriceMinor, 10) } : {}),
          },
        } : {}),
        ...(filters.city || filters.country ? {
          site: {
            ...(filters.city ? { address: { path: ['city'], equals: filters.city } } : {}),
            ...(filters.country ? { address: { path: ['country'], equals: filters.country } } : {}),
          },
        } : {}),
      },
      include: {
        organisation: { select: { legalName: true, tradingName: true, countryCode: true } },
        site: { select: { id: true, name: true, slug: true, address: true, accessHours: true, timezone: true } },
        unit: { select: { id: true, unitCode: true, kind: true, driveUp: true, status: true, unitType: { select: { id: true, sizeSqm: true, sizeCbm: true, name: true, doorType: true, features: true } } } },
        marketplaceReviews: { where: { status: 'published' }, select: { rating: true } },
      },
      take,
      skip,
      orderBy,
    });
    return listings.map((listing) => this.attachMarketplaceStats(listing));
  }

  async getPublicListingBySlug(slug: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { slug, status: 'published', unit: { status: 'available', deletedAt: null } },
      include: {
        organisation: { select: { legalName: true, tradingName: true, countryCode: true } },
        site: { select: { id: true, name: true, slug: true, address: true, accessHours: true, timezone: true, currency: true } },
        unit: { select: { id: true, unitCode: true, kind: true, driveUp: true, status: true, unitType: { select: { id: true, name: true, sizeSqm: true, sizeCbm: true, doorType: true, features: true } } } },
        marketplaceReviews: {
          where: { status: 'published' },
          select: { id: true, rating: true, title: true, body: true, reviewerName: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.attachMarketplaceStats(listing);
  }

  private async assertOwnership(organisationId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, organisationId } });
    if (!listing) throw new NotFoundException('Listing not found');
  }
}
