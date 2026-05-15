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
};

describe('ListingsService', () => {
  let service: ListingsService;

  beforeEach(() => {
    service = new ListingsService(mockPrisma as unknown as PrismaClient);
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
      mockPrisma.listing.create.mockResolvedValue({ id: 'list-1', status: 'draft', ...dto });
      const result = await service.createListing('org-1', dto);
      expect(mockPrisma.listing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organisationId: 'org-1', status: 'draft', source: 'manual' }),
        }),
      );
      expect(result.status).toBe('draft');
    });
  });

  describe('publishListing', () => {
    it('sets status to published when listing belongs to org', async () => {
      mockPrisma.listing.findFirst.mockResolvedValue({ id: 'list-1', organisationId: 'org-1', status: 'draft' });
      mockPrisma.listing.update.mockResolvedValue({ id: 'list-1', status: 'published' });
      const result = await service.publishListing('org-1', 'list-1');
      expect(result.status).toBe('published');
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
