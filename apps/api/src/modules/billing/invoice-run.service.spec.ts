import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceRunService } from './invoice-run.service';

const mockPrisma = {
  agreement: { findMany: vi.fn() },
  site: { findMany: vi.fn() },
  invoice: { findFirst: vi.fn(), upsert: vi.fn() },
  invoiceLine: { createMany: vi.fn() },
};
const mockEventBus = { emit: vi.fn() };
const service = new InvoiceRunService(mockPrisma as any, mockEventBus as any);

describe('InvoiceRunService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates invoice for active monthly agreement', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([{ id: 'agr_01', siteId: 's1', tenantId: 'cust_01', billingCycle: 'monthly', effectiveFrom: new Date('2026-05-01'), pricingSnapshot: { amountMinor: 14900, vatRate: 0.19 } }]);
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    mockPrisma.invoice.upsert.mockResolvedValue({ id: 'inv_01', status: 'pending', totalMinor: 17731, agreementId: 'agr_01', siteId: 's1' });
    mockPrisma.invoiceLine.createMany.mockResolvedValue({});
    const result = await service.runForDate(new Date('2026-06-01T01:00:00Z'));
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'invoice.created' }));
  });

  it('skips when invoice already exists (idempotent)', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([{ id: 'agr_01', siteId: 's1', tenantId: 'cust_01', billingCycle: 'monthly', effectiveFrom: new Date('2026-05-01'), pricingSnapshot: { amountMinor: 14900, vatRate: 0.19 } }]);
    mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv_existing' });
    const result = await service.runForDate(new Date('2026-06-01T01:00:00Z'));
    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockPrisma.invoice.upsert).not.toHaveBeenCalled();
  });

  it('scopes agreements to organisation when organisationId is provided', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    mockPrisma.agreement.findMany.mockResolvedValue([]);
    await service.runForDate(new Date('2026-06-01T01:00:00Z'), 'org_01');
    expect(mockPrisma.site.findMany).toHaveBeenCalledWith({ where: { organisationId: 'org_01' }, select: { id: true } });
    expect(mockPrisma.agreement.findMany).toHaveBeenCalledWith({
      where: {
        status: 'active',
        billingCycle: 'monthly',
        siteId: { in: ['s1', 's2'] },
      },
    });
  });

  it('does not scope by organisation when organisationId is omitted', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([]);
    await service.runForDate(new Date('2026-06-01T01:00:00Z'));
    expect(mockPrisma.agreement.findMany).toHaveBeenCalledWith({
      where: {
        status: 'active',
        billingCycle: 'monthly',
      },
    });
  });

  it('calculates monthly period correctly', () => {
    const period = service.calculateMonthlyPeriod(new Date('2026-06-15'));
    expect(period.start.getMonth()).toBe(5);
    expect(period.end.getMonth()).toBe(5);
    expect(period.end.getDate()).toBe(30);
  });
});
