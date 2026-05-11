import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SiteService } from './sites.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  site: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

const baseAddress = { street: 'Hauptstr. 1', city: 'Berlin', postalCode: '10115', country: 'DE' };
const createDto = { name: 'Berlin Site', address: baseAddress, timezone: 'Europe/Berlin', currency: 'EUR' };

describe('SiteService', () => {
  let service: SiteService;

  beforeEach(() => {
    service = new SiteService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listSites', () => {
    it('returns active sites for the organisation', async () => {
      const sites = [{ id: 's1', name: 'Berlin Site', organisationId: 'org1' }];
      mockPrisma.site.findMany.mockResolvedValue(sites);

      const result = await service.listSites('org1');

      expect(result).toEqual(sites);
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1', deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('createSite', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.createSite('org1', createDto, 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('creates site with auto-generated slug when owner', async () => {
      const created = { id: 's1', name: 'Berlin Site', slug: 'berlin-site', organisationId: 'org1' };
      mockPrisma.site.create.mockResolvedValue(created);

      const result = await service.createSite('org1', createDto, 'owner');

      expect(result).toEqual(created);
      expect(mockPrisma.site.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Berlin Site', organisationId: 'org1', slug: 'berlin-site' }),
        }),
      );
    });

    it('throws ConflictException when slug already exists', async () => {
      mockPrisma.site.create.mockRejectedValueOnce({ code: 'P2002' });
      await expect(service.createSite('org1', createDto, 'owner')).rejects.toThrow(ConflictException);
    });
  });

  describe('getSite', () => {
    it('returns the site when it belongs to the organisation', async () => {
      const site = { id: 's1', organisationId: 'org1' };
      mockPrisma.site.findFirst.mockResolvedValue(site);

      const result = await service.getSite('org1', 's1');

      expect(result).toEqual(site);
    });

    it('throws NotFoundException when site is not found', async () => {
      mockPrisma.site.findFirst.mockResolvedValue(null);
      await expect(service.getSite('org1', 's1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSite', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.updateSite('org1', 's1', { name: 'New Name' }, 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('updates site when role is owner', async () => {
      const site = { id: 's1', organisationId: 'org1' };
      const updated = { id: 's1', name: 'New Name' };
      mockPrisma.site.findFirst.mockResolvedValue(site);
      mockPrisma.site.update.mockResolvedValue(updated);

      const result = await service.updateSite('org1', 's1', { name: 'New Name' }, 'owner');

      expect(result).toEqual(updated);
      expect(mockPrisma.site.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { name: 'New Name' } });
    });
  });

  describe('deleteSite', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.deleteSite('org1', 's1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('soft-deletes site when role is owner', async () => {
      mockPrisma.site.findFirst.mockResolvedValue({ id: 's1', organisationId: 'org1' });
      mockPrisma.site.update.mockResolvedValue({});

      await service.deleteSite('org1', 's1', 'owner');

      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
