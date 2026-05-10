import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationsService } from './reservations.service';
import { DomainException } from '@container-os/domain-types';

const mockPrisma = {
  reservation: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  reservationHold: { findFirst: vi.fn(), delete: vi.fn() },
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn() };
const service = new ReservationsService(mockPrisma as any, mockAudit as any, mockEventBus as any);

describe('ReservationsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates reservation from valid hold', async () => {
    mockPrisma.reservationHold.findFirst.mockResolvedValue({ id: 'h1', unitId: 'u1', expiresAt: new Date(Date.now() + 60000) });
    mockPrisma.reservation.create.mockResolvedValue({ id: 'res_01', status: 'pending_signature', siteId: 's1', expiresAt: new Date() });
    mockPrisma.reservationHold.delete.mockResolvedValue({});
    const result = await service.createReservation({ siteId: 's1', unitId: 'u1', unitTypeId: 'ut1', customerId: 'cust_01', startDate: new Date(), lockToken: 'tok_01' });
    expect(result).toHaveProperty('reservationId');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'reservation.confirmed' }));
  });

  it('rejects when hold is expired', async () => {
    mockPrisma.reservationHold.findFirst.mockResolvedValue(null);
    await expect(service.createReservation({ siteId: 's1', unitId: 'u1', unitTypeId: 'ut1', customerId: 'cust_01', startDate: new Date(), lockToken: 'expired' }))
      .rejects.toBeInstanceOf(DomainException);
  });

  it('is idempotent on duplicate confirmation', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({ id: 'res_01', status: 'confirmed' });
    const result = await service.confirmReservation('res_01', 'cust_01');
    expect(result.status).toBe('confirmed');
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
  });
});
