import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListingsService } from './listings.service';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  listing: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  unit: {
    findFirst: vi.fn(),
  },
};

describe('ListingsService', () => {
  let service: ListingsService;

  beforeEach(() => {
    service = new ListingsService(mockPrisma as unknown as PrismaClient, {} as never);
    vi.clearAllMocks();
  });

  describe('createListing', () => {
    it('creates a draft listing scoped to the organisation', async () => {
      const dto = {
        unitId: 'unit-1',
        siteId: 'site-1',
        title: 'Big Box',
        bookingMode: 'approval_required' as const,
      };
      mockPrisma.unit.findFirst.mockResolvedValue({ id: 'unit-1', status: 'available', listing: null });
      mockPrisma.listing.create.mockResolvedValue({ id: 'list-1', status: 'draft', ...dto });
      const result = await service.createListing('org-1', dto);
      expect(mockPrisma.unit.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'unit-1',
            siteId: 'site-1',
            site: expect.objectContaining({ organisationId: 'org-1' }),
          }),
        }),
      );
      expect(mockPrisma.listing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organisationId: 'org-1', status: 'draft', source: 'manual' }),
        }),
      );
      expect(result.status).toBe('draft');
    });

    it('rejects a listing when the unit is not available in the organisation site', async () => {
      mockPrisma.unit.findFirst.mockResolvedValue(null);
      await expect(service.createListing('org-1', {
        unitId: 'unit-1',
        siteId: 'site-1',
        title: 'Big Box',
        bookingMode: 'approval_required',
      })).rejects.toThrow('UNIT_NOT_FOUND_FOR_SITE');
      expect(mockPrisma.listing.create).not.toHaveBeenCalled();
    });
  });

  describe('publishListing', () => {
    it('sets status to published when listing belongs to org', async () => {
      mockPrisma.listing.findFirst.mockResolvedValue({
        id: 'list-1',
        organisationId: 'org-1',
        status: 'draft',
        title: 'Secure storage box',
        description: 'A clean, dry and secure storage unit with easy vehicle access, clear pricing and flexible booking for local customers.',
        publicPriceMinor: 9900,
        showPrice: true,
        depositMinor: 9900,
        bookingMode: 'instant_booking',
        images: ['https://example.com/listing.jpg'],
        seoTitle: 'Secure storage box',
        seoDescription: 'Book a secure storage unit.',
        site: { address: { city: 'Berlin', postalCode: '10115' } },
        unit: { status: 'available', unitType: { sizeSqm: 8, features: ['Drive-up'] } },
      });
      mockPrisma.listing.update.mockResolvedValue({ id: 'list-1', status: 'published' });
      const result = await service.publishListing('org-1', 'list-1');
      expect(result.status).toBe('published');
    });

    it('blocks publishing when public marketplace quality is incomplete', async () => {
      mockPrisma.listing.findFirst.mockResolvedValue({
        id: 'list-1',
        organisationId: 'org-1',
        title: 'Box',
        description: null,
        publicPriceMinor: null,
        showPrice: true,
        depositMinor: null,
        bookingMode: 'instant_booking',
        images: [],
        site: { address: {} },
        unit: { status: 'available', unitType: { sizeSqm: 8, features: [] } },
      });
      await expect(service.publishListing('org-1', 'list-1')).rejects.toThrow();
      expect(mockPrisma.listing.update).not.toHaveBeenCalled();
    });

    it('throws when listing does not belong to org', async () => {
      mockPrisma.listing.findFirst.mockResolvedValue(null);
      await expect(service.publishListing('org-1', 'other-list')).rejects.toThrow();
    });
  });

  describe('listListings', () => {
    it('returns only listings for the given organisation', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([{ id: 'list-1', organisationId: 'org-1' }]);
      const result = await service.listListings('org-1');
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organisationId: 'org-1' }) }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
