import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganisationService } from './organisations.service';
import { ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  organisation: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
};

describe('OrganisationService', () => {
  let service: OrganisationService;

  beforeEach(() => {
    service = new OrganisationService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('getOrganisation', () => {
    it('returns the organisation by id', async () => {
      const org = { id: 'org1', legalName: 'Test GmbH' };
      mockPrisma.organisation.findUniqueOrThrow.mockResolvedValue(org);

      const result = await service.getOrganisation('org1');

      expect(result).toEqual(org);
      expect(mockPrisma.organisation.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'org1' } });
    });
  });

  describe('updateOrganisation', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.updateOrganisation('org1', { billingEmail: 'new@test.de' }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates organisation when role is owner', async () => {
      const updated = { id: 'org1', legalName: 'Test GmbH', billingEmail: 'new@test.de' };
      mockPrisma.organisation.update.mockResolvedValue(updated);

      const result = await service.updateOrganisation('org1', { billingEmail: 'new@test.de' }, 'owner');

      expect(result).toEqual(updated);
      expect(mockPrisma.organisation.update).toHaveBeenCalledWith({
        where: { id: 'org1' },
        data: { billingEmail: 'new@test.de' },
      });
    });
  });
});
