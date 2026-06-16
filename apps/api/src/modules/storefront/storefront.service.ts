import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const CHECKOUT_TTL_MINUTES = 15;

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaClient) {}

  async createCheckoutSession(input: { siteId?: string; unitTypeId?: string; listingId?: string; listingSlug?: string; startDate: Date }) {
    await this.prisma.reservationHold.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const heldIds = (await this.prisma.reservationHold.findMany({ where: { expiresAt: { gte: new Date() } }, select: { unitId: true } })).map((h) => h.unitId);

    const listing = input.listingId || input.listingSlug
      ? await this.prisma.listing.findFirst({
          where: { ...(input.listingId ? { id: input.listingId } : { slug: input.listingSlug }), status: 'published' },
          include: { unit: true },
        })
      : null;
    const siteId = listing?.siteId ?? input.siteId;
    const unitTypeId = listing?.unit.unitTypeId ?? input.unitTypeId;
    const unit = listing?.unit?.status === 'available' && !heldIds.includes(listing.unitId)
      ? listing.unit
      : await this.prisma.unit.findFirst({
          where: { siteId, unitTypeId, status: 'available', deletedAt: null, ...(heldIds.length > 0 ? { id: { notIn: heldIds } } : {}) },
        });
    if (!unit) return { availabilityState: 'sold_out' as const };

    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MINUTES * 60 * 1000);
    const [hold, session] = await Promise.all([
      this.prisma.reservationHold.create({ data: { unitId: unit.id, expiresAt } }),
      this.prisma.checkoutSession.create({
        data: {
          siteId: siteId!,
          unitTypeId: unitTypeId!,
          expiresAt,
          metadata: {
            startDate: input.startDate.toISOString(),
            unitId: unit.id,
            listingId: listing?.id,
            listingSlug: listing?.slug,
            bookingMode: listing?.bookingMode,
            pricingSnapshot: listing ? {
              rentMinor: listing.publicPriceMinor,
              depositMinor: listing.depositMinor,
              showPrice: listing.showPrice,
              currency: 'EUR',
            } : undefined,
            requiredDocs: listing?.requiredDocs ?? [],
          },
        },
      }),
    ]);

    return { checkoutSessionId: session.id, expiresAt: session.expiresAt, availabilityState: 'available' as const, lockToken: hold.lockToken, listingId: listing?.id ?? null, bookingMode: listing?.bookingMode ?? null };
  }

  async createQuoteRequest(siteId: string, contact: object, requirements?: object) {
    return this.prisma.quoteRequest.create({ data: { siteId, contact, requirements } });
  }

  async createSavedSearch(input: { email: string; city?: string; query?: string; locale?: string; filters?: Record<string, unknown> }) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new BadRequestException('Valid email is required');
    }
    return this.prisma.savedSearch.create({
      data: {
        email: input.email.toLowerCase(),
        city: input.city || undefined,
        query: input.query || undefined,
        locale: input.locale || 'de',
        filters: (input.filters ?? {}) as Prisma.InputJsonValue,
      },
      select: { id: true, email: true, city: true, query: true, status: true, createdAt: true },
    });
  }

  async createMarketplaceReview(input: { listingId: string; rating: number; title?: string; body?: string; reviewerName?: string; reviewerEmail?: string }) {
    if (!input.listingId) throw new BadRequestException('listingId is required');
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new BadRequestException('rating must be between 1 and 5');
    }
    const listing = await this.prisma.listing.findFirst({
      where: { id: input.listingId, status: 'published' },
      select: { id: true, organisationId: true, siteId: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return this.prisma.marketplaceReview.create({
      data: {
        listingId: listing.id,
        organisationId: listing.organisationId,
        siteId: listing.siteId,
        rating: input.rating,
        title: input.title || undefined,
        body: input.body || undefined,
        reviewerName: input.reviewerName || undefined,
        reviewerEmail: input.reviewerEmail?.toLowerCase() || undefined,
      },
      select: { id: true, listingId: true, rating: true, title: true, body: true, reviewerName: true, status: true, createdAt: true },
    });
  }

  async recordMarketplaceEvent(input: { listingId?: string; eventType: string; source?: string; sessionId?: string; metadata?: Record<string, unknown> }) {
    if (!input.eventType) throw new BadRequestException('eventType is required');
    const allowedEvents = ['listing_view', 'booking_click', 'search', 'saved_search', 'quote_request'];
    if (!allowedEvents.includes(input.eventType)) throw new BadRequestException('Unsupported marketplace event');

    let listing: { id: string; organisationId: string; siteId: string } | null = null;
    if (input.listingId) {
      listing = await this.prisma.listing.findUnique({
        where: { id: input.listingId },
        select: { id: true, organisationId: true, siteId: true },
      });
    }
    return this.prisma.marketplaceEvent.create({
      data: {
        listingId: listing?.id,
        organisationId: listing?.organisationId,
        siteId: listing?.siteId,
        eventType: input.eventType,
        source: input.source || 'web',
        sessionId: input.sessionId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
      select: { id: true, eventType: true, createdAt: true },
    });
  }
}
