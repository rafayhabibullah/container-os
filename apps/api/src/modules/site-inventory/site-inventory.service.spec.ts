import { describe, it, expect, vi } from 'vitest';
import { SiteInventoryService } from './site-inventory.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  unit: { findUniqueOrThrow: vi.fn(), update: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  inventoryEvent: { create: vi.fn() },
  site: { findMany: vi.fn() },
};
const mockAudit = { record: vi.fn(), hasLegalHold: vi.fn().mockResolvedValue(false) };
const mockEventBus = { emit: vi.fn() };

const service = new SiteInventoryService(mockPrisma as any, mockAudit as any, mockEventBus as any);

describe('SiteInventoryService', () => {
  it('allows occupied → maintenance transition', async () => {
    mockPrisma.unit.findUniqueOrThrow.mockResolvedValue({ id: 'u1', status: 'occupied', siteId: 's1', unitCode: 'A-1', auditVersion: 1 });
    mockPrisma.unit.update.mockResolvedValue({ id: 'u1', status: 'maintenance' });
    mockPrisma.inventoryEvent.create.mockResolvedValue({});
    await service.transitionUnitStatus('u1', 'maintenance', 'actor_01', 'maintenance');
    expect(mockPrisma.unit.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'u1' }), data: expect.objectContaining({ status: 'maintenance' }) })
    );
  });

  it('blocks occupied → available transition', async () => {
    mockPrisma.unit.findUniqueOrThrow.mockResolvedValue({ id: 'u1', status: 'occupied', siteId: 's1', unitCode: 'A-1', auditVersion: 1 });
    await expect(service.transitionUnitStatus('u1', 'available', 'actor_01', '')).rejects.toBeInstanceOf(DomainException);
  });

  it('blocks deletion with legal hold', async () => {
    mockAudit.hasLegalHold.mockResolvedValueOnce(true);
    await expect(service.deleteUnit('u1', 'actor_01')).rejects.toBeInstanceOf(DomainException);
  });

  it('rejects duplicate unitCode', async () => {
    mockPrisma.unit.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(
      service.createUnit({ siteId: 's1', unitCode: 'A-1', unitTypeId: 'ut1', kind: 'container', driveUp: true })
    ).rejects.toBeInstanceOf(DomainException);
  });
});
