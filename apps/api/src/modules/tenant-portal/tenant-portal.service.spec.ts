import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantPortalService } from './tenant-portal.service';

const mockPrisma = {
  agreement: { findMany: vi.fn(), findFirstOrThrow: vi.fn() },
  invoice: { findMany: vi.fn() },
};

const service = new TenantPortalService(mockPrisma as any);

const tenantId = 'cust_01';

const agreement = {
  id: 'agr_01', tenantId, siteId: 'site_01', unitId: 'unit_01',
  status: 'active', billingCycle: 'monthly', effectiveFrom: new Date('2026-01-01'),
  pricingSnapshot: { amountMinor: 14900 },
  signatories: [], amendments: [],
};

describe('TenantPortalService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists only active/signed agreements for the tenant', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([agreement]);
    const result = await service.listMyAgreements(tenantId);
    expect(result).toHaveLength(1);
    expect(mockPrisma.agreement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, status: { in: ['active', 'signed', 'pending_signature'] } }),
      }),
    );
  });

  it('returns agreement detail only when tenantId matches', async () => {
    mockPrisma.agreement.findFirstOrThrow.mockResolvedValue(agreement);
    const result = await service.getMyAgreement(tenantId, 'agr_01');
    expect(result).toHaveProperty('id', 'agr_01');
    expect(mockPrisma.agreement.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'agr_01', tenantId }) }),
    );
  });

  it('lists invoices for tenant across all agreements', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([{ id: 'agr_01' }]);
    mockPrisma.invoice.findMany.mockResolvedValue([
      { id: 'inv_01', agreementId: 'agr_01', status: 'pending', totalMinor: 14900, dueDate: new Date() },
    ]);
    const result = await service.listMyInvoices(tenantId);
    expect(result).toHaveLength(1);
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ agreementId: { in: ['agr_01'] } }) }),
    );
  });
});
