import { describe, it, expect, vi } from 'vitest';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const mockPrisma = {
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'evt_01' }) },
    legalHold: { findFirst: vi.fn().mockResolvedValue(null) },
  };

  const service = new AuditService(mockPrisma as any);

  it('creates an audit event with correct shape', async () => {
    await service.record({
      actorId: 'usr_01',
      actorType: 'operator',
      action: 'unit.status_changed',
      subjectType: 'Unit',
      subjectId: 'unit_01',
      changes: { from: 'available', to: 'occupied' },
      siteId: 'site_01',
    });

    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'usr_01',
        action: 'unit.status_changed',
        subjectType: 'Unit',
        subjectId: 'unit_01',
      }),
    });
  });

  it('detects active legal hold for subject', async () => {
    mockPrisma.legalHold.findFirst.mockResolvedValueOnce({ id: 'hold_01', active: true });
    const held = await service.hasLegalHold('Unit', 'unit_01');
    expect(held).toBe(true);
  });

  it('returns false when no legal hold exists', async () => {
    mockPrisma.legalHold.findFirst.mockResolvedValue(null);
    const held = await service.hasLegalHold('Invoice', 'inv_01');
    expect(held).toBe(false);
  });
});
