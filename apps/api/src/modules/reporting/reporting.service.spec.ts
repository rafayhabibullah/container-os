import { describe, it, expect, vi } from 'vitest';
import { ReportingService } from './reporting.service';

const mockPrisma = {
  unit: { groupBy: vi.fn() },
  invoice: { aggregate: vi.fn() },
};
const service = new ReportingService(mockPrisma as any);

describe('ReportingService', () => {
  it('calculates occupancy percentage for a site', async () => {
    mockPrisma.unit.groupBy.mockResolvedValue([
      { status: 'available', _count: { status: 20 } },
      { status: 'occupied', _count: { status: 75 } },
      { status: 'maintenance', _count: { status: 5 } },
    ]);
    const result = await service.getOccupancyReport(['site_01'], new Date(), new Date());
    expect(result[0].occupancyPct).toBeCloseTo(75);
  });

  it('returns revenue total from paid invoices', async () => {
    mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { totalMinor: 1490000 } });
    const result = await service.getRevenueReport(['site_01'], new Date('2026-06-01'), new Date('2026-06-30'));
    expect(result[0].totalMinor).toBe(1490000);
  });
});
