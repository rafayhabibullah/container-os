import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanEnforcementService } from './plan-enforcement.service';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';

const mockPrisma = {
  organisation: {
    findUnique: vi.fn(),
  },
  site: {
    count: vi.fn(),
  },
  unit: {
    count: vi.fn(),
  },
};

describe('PlanEnforcementService', () => {
  let service: PlanEnforcementService;

  beforeEach(() => {
    service = new PlanEnforcementService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('assertCanCreateSite', () => {
    it('passes when under the limit', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'starter' });
      mockPrisma.site.count.mockResolvedValue(0);

      await expect(service.assertCanCreateSite('org1')).resolves.toBeUndefined();
    });

    it('throws PLAN_LIMIT_EXCEEDED when at the limit', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'starter' });
      mockPrisma.site.count.mockResolvedValue(1);

      await expect(service.assertCanCreateSite('org1')).rejects.toThrow(DomainException);
      await expect(service.assertCanCreateSite('org1')).rejects.toMatchObject({ code: ErrorCodes.PLAN_LIMIT_EXCEEDED });
    });

    it('throws PLAN_LIMIT_EXCEEDED when over the limit', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'professional' });
      mockPrisma.site.count.mockResolvedValue(6);

      await expect(service.assertCanCreateSite('org1')).rejects.toMatchObject({ code: ErrorCodes.PLAN_LIMIT_EXCEEDED });
    });

    it('never throws for enterprise plan', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'enterprise' });
      mockPrisma.site.count.mockResolvedValue(10_000);

      await expect(service.assertCanCreateSite('org1')).resolves.toBeUndefined();
    });
  });

  describe('assertCanCreateUnit', () => {
    it('passes when under the limit', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'starter' });
      mockPrisma.unit.count.mockResolvedValue(49);

      await expect(service.assertCanCreateUnit('org1')).resolves.toBeUndefined();
    });

    it('throws PLAN_LIMIT_EXCEEDED when at the limit', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'starter' });
      mockPrisma.unit.count.mockResolvedValue(50);

      await expect(service.assertCanCreateUnit('org1')).rejects.toMatchObject({ code: ErrorCodes.PLAN_LIMIT_EXCEEDED });
    });

    it('never throws for enterprise plan', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'enterprise' });
      mockPrisma.unit.count.mockResolvedValue(1_000_000);

      await expect(service.assertCanCreateUnit('org1')).resolves.toBeUndefined();
    });
  });

  describe('getUsage', () => {
    it('returns plan and usage counts', async () => {
      mockPrisma.organisation.findUnique.mockResolvedValue({ id: 'org1', plan: 'professional' });
      mockPrisma.site.count.mockResolvedValue(2);
      mockPrisma.unit.count.mockResolvedValue(120);

      const result = await service.getUsage('org1');

      expect(result).toEqual({
        plan: 'professional',
        sites: { used: 2, limit: 5 },
        units: { used: 120, limit: 500 },
      });
    });
  });
});
