import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontService } from './storefront.service';

const mockPrisma = {
  checkoutSession: { create: vi.fn() },
  reservationHold: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
  unit: { findFirst: vi.fn() },
  quoteRequest: { create: vi.fn() },
};
const service = new StorefrontService(mockPrisma as any);

describe('StorefrontService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates checkout session and hold when unit available', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'u1', status: 'available' });
    mockPrisma.reservationHold.findMany.mockResolvedValue([]);
    mockPrisma.reservationHold.create.mockResolvedValue({ id: 'h1', lockToken: 'tok_01', expiresAt: new Date() });
    mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'chk_01', expiresAt: new Date(), state: 'started' });

    const result = await service.createCheckoutSession('site_01', 'ut1', new Date());
    expect(result.availabilityState).toBe('available');
    expect(result).toHaveProperty('checkoutSessionId');
  });

  it('returns sold_out when no unit available', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue(null);
    mockPrisma.reservationHold.findMany.mockResolvedValue([]);
    const result = await service.createCheckoutSession('site_01', 'ut1', new Date());
    expect(result.availabilityState).toBe('sold_out');
    expect(mockPrisma.checkoutSession.create).not.toHaveBeenCalled();
  });

  it('cleans up expired holds before creating new', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'u1', status: 'available' });
    mockPrisma.reservationHold.findMany.mockResolvedValue([]);
    mockPrisma.reservationHold.create.mockResolvedValue({ id: 'h1', lockToken: 'tok', expiresAt: new Date() });
    mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'chk_01', expiresAt: new Date() });
    await service.createCheckoutSession('site_01', 'ut1', new Date());
    expect(mockPrisma.reservationHold.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ expiresAt: expect.any(Object) }) })
    );
  });
});
