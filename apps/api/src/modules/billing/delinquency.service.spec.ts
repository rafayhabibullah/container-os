import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DelinquencyService } from './delinquency.service';

const mockPrisma = {
  invoice: { findMany: vi.fn(), update: vi.fn() },
  delinquencyPolicy: { findFirst: vi.fn().mockResolvedValue({ overdueDays: 14, lockoutEnabled: true }) },
};
const mockEventBus = { emit: vi.fn() };
const service = new DelinquencyService(mockPrisma as any, mockEventBus as any);

describe('DelinquencyService', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.delinquencyPolicy.findFirst.mockResolvedValue({ overdueDays: 14 }); });

  it('marks invoice overdue and emits event past threshold', async () => {
    const overdueDueDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    mockPrisma.invoice.findMany.mockResolvedValue([{ id: 'inv_01', dueDate: overdueDueDate, agreementId: 'agr_01', siteId: 's1' }]);
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv_01', status: 'overdue', agreementId: 'agr_01', siteId: 's1' });
    await service.checkOverdueInvoices('s1');
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'overdue' } }));
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'invoice.overdue' }));
  });

  it('does not call update when DB returns no overdue invoices', async () => {
    // The DB filter (dueDate < threshold) returns nothing for recent invoices
    mockPrisma.invoice.findMany.mockResolvedValue([]);
    await service.checkOverdueInvoices('s1');
    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(mockEventBus.emit).not.toHaveBeenCalled();
  });
});
