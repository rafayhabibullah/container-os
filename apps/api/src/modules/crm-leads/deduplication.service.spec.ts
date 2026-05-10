import { describe, it, expect, vi } from 'vitest';
import { DeduplicationService } from './deduplication.service';

const mockPrisma = { contact: { findFirst: vi.fn() } };
const service = new DeduplicationService(mockPrisma as any);

describe('DeduplicationService', () => {
  it('finds existing customer by email', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({ customerId: 'cust_01' });
    expect((await service.findDuplicate('anna@example.com'))?.customerId).toBe('cust_01');
  });
  it('returns null when no match', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null);
    expect(await service.findDuplicate('new@example.com')).toBeNull();
  });
  it('finds by phone when email not found', async () => {
    mockPrisma.contact.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ customerId: 'cust_02' });
    expect((await service.findDuplicate('x@x.com', '+491234'))?.customerId).toBe('cust_02');
  });
});
