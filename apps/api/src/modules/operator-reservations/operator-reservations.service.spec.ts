import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperatorReservationsService } from './operator-reservations.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  reservation: {
    findMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
  },
  agreement: { create: vi.fn() },
  site: { findMany: vi.fn() },
};
const mockAudit = { record: vi.fn() };

const service = new OperatorReservationsService(mockPrisma as any, mockAudit as any);

describe('OperatorReservationsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists reservations filtered by organisationId (via site join)', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findMany.mockResolvedValue([
      { id: 'res_01', status: 'pending_signature', siteId: 'site_01' },
    ]);
    const result = await service.listReservations('org_01', {});
    expect(result).toHaveLength(1);
    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ siteId: { in: ['site_01'] } }) }),
    );
  });

  it('cancels a reservation and records audit', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findFirstOrThrow.mockResolvedValue({ id: 'res_01', siteId: 'site_01', status: 'pending_signature' });
    mockPrisma.reservation.update.mockResolvedValue({ id: 'res_01', status: 'cancelled' });
    const result = await service.updateReservationStatus('org_01', 'res_01', 'cancelled', 'actor_01');
    expect(result.status).toBe('cancelled');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'reservation.cancelled' }),
    );
  });

  it('rejects status update when reservation does not belong to org', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findFirstOrThrow.mockRejectedValue(new Error('Not found'));
    await expect(
      service.updateReservationStatus('org_01', 'res_99', 'cancelled', 'actor_01'),
    ).rejects.toThrow();
  });

  it('creates a draft agreement from a confirmed reservation', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findFirstOrThrow.mockResolvedValue({
      id: 'res_01', siteId: 'site_01', unitId: 'unit_01', customerId: 'cust_01', status: 'confirmed',
    });
    mockPrisma.reservation.update.mockResolvedValue({ id: 'res_01', status: 'converted' });
    mockPrisma.agreement.create.mockResolvedValue({ id: 'agr_01', status: 'draft' });
    const result = await service.createAgreementFromReservation('org_01', 'res_01', {
      billingCycle: 'monthly', language: 'de', pricingSnapshot: { amountMinor: 14900 },
    }, 'actor_01');
    expect(result.agreementId).toBe('agr_01');
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'converted' }) }),
    );
  });
});
