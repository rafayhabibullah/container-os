import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmLeadsService } from './crm-leads.service';

const mockPrisma = {
  lead: { create: vi.fn().mockResolvedValue({ id: 'lead_01', status: 'new' }), findMany: vi.fn() },
  customer: { create: vi.fn().mockResolvedValue({ id: 'cust_01' }) },
  contact: { create: vi.fn() },
};
const mockDedup = { findDuplicate: vi.fn().mockResolvedValue(null) };
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn() };
const service = new CrmLeadsService(mockPrisma as any, mockDedup as any, mockAudit as any, mockEventBus as any);

describe('CrmLeadsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.lead.create.mockResolvedValue({ id: 'lead_01', status: 'new' });
    mockPrisma.customer.create.mockResolvedValue({ id: 'cust_01' });
    mockDedup.findDuplicate.mockResolvedValue(null);
  });

  it('creates lead and new customer when no duplicate', async () => {
    const result = await service.createLead({ siteId: 's1', name: 'Anna', email: 'anna@example.com', source: 'storefront' });
    expect(mockPrisma.customer.create).toHaveBeenCalled();
    expect(result).toHaveProperty('leadId', 'lead_01');
  });
  it('links to existing customer when duplicate found', async () => {
    mockDedup.findDuplicate.mockResolvedValueOnce({ customerId: 'cust_existing' });
    await service.createLead({ siteId: 's1', name: 'Anna', email: 'anna@example.com', source: 'storefront' });
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    expect(mockPrisma.lead.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: 'cust_existing' }) }));
  });
});
