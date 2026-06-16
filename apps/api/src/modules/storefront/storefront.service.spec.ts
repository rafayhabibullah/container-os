import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontService } from './storefront.service';

const mockPrisma = {
  checkoutSession: { create: vi.fn() },
  reservationHold: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  unit: { findFirst: vi.fn() },
  listing: { findFirst: vi.fn(), findUnique: vi.fn() },
  quoteRequest: { create: vi.fn() },
  savedSearch: { create: vi.fn() },
  marketplaceReview: { create: vi.fn() },
  marketplaceEvent: { create: vi.fn() },
};
const service = new StorefrontService(mockPrisma as any);

describe('StorefrontService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates checkout session and hold when unit available', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'u1', status: 'available' });
    mockPrisma.reservationHold.findMany.mockResolvedValue([]);
    mockPrisma.reservationHold.create.mockResolvedValue({ id: 'h1', lockToken: 'tok_01', expiresAt: new Date() });
    mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'chk_01', expiresAt: new Date(), state: 'started' });

    const result = await service.createCheckoutSession({ siteId: 'site_01', unitTypeId: 'ut1', startDate: new Date() });
    expect(result.availabilityState).toBe('available');
    expect(result).toHaveProperty('checkoutSessionId');
  });

  it('returns sold_out when no unit available', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue(null);
    mockPrisma.reservationHold.findMany.mockResolvedValue([]);
    const result = await service.createCheckoutSession({ siteId: 'site_01', unitTypeId: 'ut1', startDate: new Date() });
    expect(result.availabilityState).toBe('sold_out');
    expect(mockPrisma.checkoutSession.create).not.toHaveBeenCalled();
  });

  it('cleans up expired holds before creating new', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'u1', status: 'available' });
    mockPrisma.reservationHold.findMany.mockResolvedValue([]);
    mockPrisma.reservationHold.create.mockResolvedValue({ id: 'h1', lockToken: 'tok', expiresAt: new Date() });
    mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'chk_01', expiresAt: new Date() });
    await service.createCheckoutSession({ siteId: 'site_01', unitTypeId: 'ut1', startDate: new Date() });
    expect(mockPrisma.reservationHold.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ expiresAt: expect.any(Object) }) })
    );
  });

  it('captures saved searches for marketplace alerts', async () => {
    mockPrisma.savedSearch.create.mockResolvedValue({ id: 'ss_01', email: 'anna@example.com', status: 'active' });
    const result = await service.createSavedSearch({ email: 'Anna@Example.com', city: 'Berlin', query: 'drive-up', filters: { maxPrice: 150 } });
    expect(result).toHaveProperty('id', 'ss_01');
    expect(mockPrisma.savedSearch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'anna@example.com', city: 'Berlin', query: 'drive-up' }),
      }),
    );
  });

  it('creates public reviews against published listings', async () => {
    mockPrisma.listing.findFirst.mockResolvedValue({ id: 'list_01', organisationId: 'org_01', siteId: 'site_01' });
    mockPrisma.marketplaceReview.create.mockResolvedValue({ id: 'rev_01', listingId: 'list_01', rating: 5 });
    const result = await service.createMarketplaceReview({ listingId: 'list_01', rating: 5, reviewerEmail: 'tenant@example.com' });
    expect(result.rating).toBe(5);
    expect(mockPrisma.marketplaceReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ listingId: 'list_01', organisationId: 'org_01', siteId: 'site_01' }),
      }),
    );
  });

  it('records marketplace analytics events', async () => {
    mockPrisma.listing.findUnique.mockResolvedValue({ id: 'list_01', organisationId: 'org_01', siteId: 'site_01' });
    mockPrisma.marketplaceEvent.create.mockResolvedValue({ id: 'evt_01', eventType: 'listing_view' });
    const result = await service.recordMarketplaceEvent({ listingId: 'list_01', eventType: 'listing_view', metadata: { path: '/storage/test' } });
    expect(result.eventType).toBe('listing_view');
    expect(mockPrisma.marketplaceEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ listingId: 'list_01', organisationId: 'org_01', siteId: 'site_01' }),
      }),
    );
  });
});
