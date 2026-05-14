import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingManagementService } from './pricing-management.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BillingCycle } from '@sitelager/domain-types';

const mockPrisma = {
  priceBook: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  rateRule: {
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
};

describe('PricingManagementService', () => {
  let service: PricingManagementService;

  beforeEach(() => {
    service = new PricingManagementService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listPriceBooks', () => {
    it('returns price books for the site', async () => {
      const books = [{ id: 'pb1', siteId: 's1', name: 'Standard' }];
      mockPrisma.priceBook.findMany.mockResolvedValue(books);

      const result = await service.listPriceBooks('s1');

      expect(result).toEqual(books);
      expect(mockPrisma.priceBook.findMany).toHaveBeenCalledWith({
        where: { siteId: 's1' },
        include: { rules: true },
        orderBy: { effectiveFrom: 'desc' },
      });
    });
  });

  describe('createPriceBook', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.createPriceBook('s1', { name: 'Test', effectiveFrom: '2026-01-01' }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates price book in draft status when owner', async () => {
      const created = { id: 'pb1', siteId: 's1', name: 'Test', status: 'draft' };
      mockPrisma.priceBook.create.mockResolvedValue(created);

      const result = await service.createPriceBook('s1', { name: 'Test', effectiveFrom: '2026-01-01' }, 'owner');

      expect(result).toEqual(created);
      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ siteId: 's1', name: 'Test', status: 'draft' }),
      });
    });
  });

  describe('publishPriceBook', () => {
    it('throws NotFoundException when price book not found', async () => {
      mockPrisma.priceBook.findFirst.mockResolvedValue(null);
      await expect(service.publishPriceBook('s1', 'pb1', 'owner')).rejects.toThrow(NotFoundException);
    });

    it('sets status to published', async () => {
      mockPrisma.priceBook.findFirst.mockResolvedValue({ id: 'pb1', siteId: 's1', status: 'draft' });
      mockPrisma.priceBook.update.mockResolvedValue({ id: 'pb1', status: 'published' });

      const result = await service.publishPriceBook('s1', 'pb1', 'owner');

      expect(result).toEqual({ id: 'pb1', status: 'published' });
      expect(mockPrisma.priceBook.update).toHaveBeenCalledWith({
        where: { id: 'pb1' },
        data: { status: 'published' },
      });
    });
  });

  describe('addRateRule', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.addRateRule('s1', 'pb1', { unitTypeId: 'ut1', amountMinor: 8900, billingCycle: BillingCycle.Monthly }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates rate rule when owner', async () => {
      mockPrisma.priceBook.findFirst.mockResolvedValue({ id: 'pb1', siteId: 's1' });
      const rule = { id: 'rr1', priceBookId: 'pb1', unitTypeId: 'ut1', amountMinor: 8900 };
      mockPrisma.rateRule.create.mockResolvedValue(rule);

      const result = await service.addRateRule(
        's1', 'pb1', { unitTypeId: 'ut1', amountMinor: 8900, billingCycle: BillingCycle.Monthly }, 'owner',
      );

      expect(result).toEqual(rule);
    });
  });

  describe('removeRateRule', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.removeRateRule('s1', 'pb1', 'rr1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('deletes rate rule when owner', async () => {
      mockPrisma.rateRule.findFirst.mockResolvedValue({ id: 'rr1', priceBook: { siteId: 's1' } });
      mockPrisma.rateRule.delete.mockResolvedValue({});

      await service.removeRateRule('s1', 'pb1', 'rr1', 'owner');

      expect(mockPrisma.rateRule.delete).toHaveBeenCalledWith({ where: { id: 'rr1' } });
    });
  });
});
