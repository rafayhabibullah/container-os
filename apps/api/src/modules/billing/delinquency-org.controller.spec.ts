import { describe, it, expect, vi } from 'vitest';
import { DelinquencyOrgController } from './delinquency-org.controller';
import { ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  delinquencyPolicy: {
    findFirst: vi.fn().mockResolvedValue({ id: 'pol_01', siteId: 's1', overdueDays: 14, lockoutEnabled: true }),
    upsert: vi.fn().mockResolvedValue({ id: 'pol_01', overdueDays: 21, lockoutEnabled: false }),
  },
};
const mockDelinquency = { checkOverdueInvoices: vi.fn().mockResolvedValue(undefined) };

const controller = new DelinquencyOrgController(mockDelinquency as any, mockPrisma as any);

describe('DelinquencyOrgController', () => {
  it('getPolicy returns delinquency policy for site', async () => {
    const result = await controller.getPolicy('org_01', 's1');
    expect(mockPrisma.delinquencyPolicy.findFirst).toHaveBeenCalledWith({ where: { siteId: 's1' } });
    expect(result).toHaveProperty('overdueDays');
  });

  it('updatePolicy upserts policy for site', async () => {
    const result = await controller.updatePolicy('org_01', 's1', { overdueDays: 21, lockoutEnabled: false });
    expect(mockPrisma.delinquencyPolicy.upsert).toHaveBeenCalled();
    expect(result).toHaveProperty('overdueDays', 21);
  });

  it('runDelinquency calls DelinquencyService for owner', async () => {
    await controller.runDelinquency('org_01', { body: { siteId: 's1' } } as any, { role: 'owner' } as any);
    expect(mockDelinquency.checkOverdueInvoices).toHaveBeenCalledWith('s1');
  });

  it('runDelinquency throws ForbiddenException for non-owner', async () => {
    await expect(
      controller.runDelinquency('org_01', { body: { siteId: 's1' } } as any, { role: 'member' } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
