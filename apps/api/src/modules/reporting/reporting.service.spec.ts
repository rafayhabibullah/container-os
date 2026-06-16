import { describe, it, expect, vi } from 'vitest';
import { ReportingService } from './reporting.service';

const mockPrisma = {
  site: { findMany: vi.fn() },
  unit: { groupBy: vi.fn(), findMany: vi.fn() },
  invoice: { aggregate: vi.fn(), findMany: vi.fn() },
  agreement: { findMany: vi.fn() },
  reservation: { findMany: vi.fn() },
  lead: { findMany: vi.fn() },
  mandate: { findMany: vi.fn() },
  inspectionRun: { findMany: vi.fn() },
  task: { groupBy: vi.fn(), findMany: vi.fn() },
  incident: { groupBy: vi.fn(), findMany: vi.fn() },
  paymentAttempt: { findMany: vi.fn() },
  $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
};
const service = new ReportingService(mockPrisma as any);

describe('ReportingService', () => {
  it('builds an executive portfolio report with recommendations', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01', name: 'Berlin' }]);
    mockPrisma.unit.findMany.mockResolvedValue(Array.from({ length: 10 }, (_, index) => ({ siteId: 'site_01', status: index < 9 ? 'occupied' : 'available' })));
    mockPrisma.invoice.findMany
      .mockResolvedValueOnce([
        { siteId: 'site_01', status: 'paid', totalMinor: 10000, dueDate: new Date('2026-06-10') },
        { siteId: 'site_01', status: 'overdue', totalMinor: 2000, dueDate: new Date('2026-06-01') },
      ])
      .mockResolvedValueOnce([{ status: 'paid', totalMinor: 8000 }]);
    mockPrisma.lead.findMany
      .mockResolvedValueOnce([{ status: 'converted', source: 'marketplace' }, { status: 'new', source: 'web' }])
      .mockResolvedValueOnce([{ status: 'converted' }]);
    mockPrisma.reservation.findMany.mockResolvedValue([{ status: 'confirmed', source: 'marketplace' }]);
    mockPrisma.task.findMany.mockResolvedValue([{ status: 'open', priority: 'high', dueAt: new Date('2026-06-01') }]);
    mockPrisma.incident.findMany.mockResolvedValue([{ status: 'open', severity: 'high' }]);

    const result = await service.getExecutiveReport('org_01', '2026-06-01', '2026-06-30');

    expect(result.kpis.revenueMinor).toBe(10000);
    expect(result.kpis.collectionRatePct).toBeCloseTo(83.3);
    expect(result.kpis.occupancyPct).toBe(90);
    expect(result.sitePerformance[0].siteName).toBe('Berlin');
    expect(result.recommendations.some((item) => item.type === 'collections')).toBe(true);
  });

  it('calculates occupancy percentage for a site', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.unit.groupBy.mockResolvedValue([
      { status: 'available', _count: { status: 20 } },
      { status: 'occupied', _count: { status: 75 } },
      { status: 'maintenance', _count: { status: 5 } },
    ]);
    mockPrisma.unit.findMany.mockResolvedValue([
      { status: 'occupied', unitType: { id: 'ut_1', name: 'Small', sizeSqm: 5 } },
      { status: 'available', unitType: { id: 'ut_1', name: 'Small', sizeSqm: 5 } },
    ]);
    const result = await service.getOccupancyReport('org_01');
    expect(result[0].occupancyPct).toBeCloseTo(75);
    expect(result[0].byUnitType[0].unitTypeName).toBe('Small');
  });

  it('returns revenue breakdown from paid invoices', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.invoice.findMany.mockResolvedValue([
      { siteId: 'site_01', totalMinor: 1490000, invoiceDate: new Date('2026-06-01'), payments: [{ method: 'sepa_core', status: 'succeeded', amountMinor: 1490000 }] },
    ]);
    const result = await service.getRevenueReport('org_01');
    expect(result.sites[0].totalMinor).toBe(1490000);
    expect(result.byMonth[0].totalMinor).toBe(1490000);
    expect(result.byPaymentMethod[0].method).toBe('sepa_core');
  });

  it('groups outstanding invoices into aging buckets per customer', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    const now = new Date();
    mockPrisma.invoice.findMany.mockResolvedValue([
      { id: 'inv_1', totalMinor: 5000, dueDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000), agreement: { tenantId: 'cust_1' } },
    ]);
    const result = await service.getDelinquencyReport('org_01');
    expect(result[0].customerId).toBe('cust_1');
    expect(result[0].buckets['31-60']).toBe(5000);
    expect(result[0].total).toBe(5000);
  });

  it('lists terminated agreements as churn', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.agreement.findMany.mockResolvedValue([
      { id: 'agr_1', tenantId: 'cust_1', unitId: 'unit_1', siteId: 'site_01', updatedAt: new Date(), amendments: [{ data: { reason: 'moved out' } }] },
    ]);
    const result = await service.getChurnReport('org_01');
    expect(result.count).toBe(1);
    expect(result.agreements[0].reason).toBe('moved out');
  });

  it('reports lead conversion by status and source', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.lead.findMany.mockResolvedValue([
      { status: 'converted', source: 'web' },
      { status: 'new', source: 'web' },
    ]);
    const result = await service.getLeadConversionReport('org_01');
    expect(result.total).toBe(2);
    expect(result.converted).toBe(1);
    expect(result.conversionRatePct).toBeCloseTo(50);
  });

  it('groups SEPA mandates by status and scheme', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.mandate.findMany.mockResolvedValue([
      { status: 'active', scheme: 'sepa_core' },
      { status: 'active', scheme: 'sepa_core' },
      { status: 'pending', scheme: 'sepa_b2b' },
    ]);
    const result = await service.getMandateStatusReport('org_01');
    const active = result.find((r) => r.status === 'active' && r.scheme === 'sepa_core');
    expect(active?.count).toBe(2);
  });

  it('summarises inspection runs by result', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.inspectionRun.findMany.mockResolvedValue([
      { result: 'pass', checklist: [{ passed: true }] },
      { result: 'fail', checklist: [{ passed: false }, { passed: true }] },
    ]);
    const result = await service.getInspectionsReport('org_01');
    expect(result.total).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failedChecklistItems).toBe(1);
    expect(result.tasksCreated).toBe(1);
  });

  it('groups tasks and incidents for operations report', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.task.groupBy
      .mockResolvedValueOnce([{ priority: 'high', status: 'open', _count: { _all: 3 } }])
      .mockResolvedValueOnce([{ type: 'repair_unit', status: 'open', _count: { _all: 2 } }]);
    mockPrisma.incident.groupBy.mockResolvedValue([{ status: 'open', severity: 'high', _count: { _all: 1 } }]);
    const result = await service.getOperationsReport('org_01');
    expect(result.tasksByPriority[0].count).toBe(3);
    expect(result.tasksByType[0].count).toBe(2);
    expect(result.incidentsByStatus[0].count).toBe(1);
  });

  it('groups payment attempts by status and provider', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.paymentAttempt.findMany.mockResolvedValue([
      { status: 'succeeded', provider: 'mollie', payment: { amountMinor: 1000 } },
      { status: 'failed', provider: 'stripe', payment: { amountMinor: 500 } },
    ]);
    const result = await service.getPaymentsReport('org_01');
    const succeeded = result.find((r) => r.status === 'succeeded');
    expect(succeeded?.totalMinor).toBe(1000);
    expect(result.length).toBe(2);
  });
});
