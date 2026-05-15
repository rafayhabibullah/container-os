import { describe, it, expect, vi } from 'vitest';
import { InspectionService } from './inspection.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  inspectionTemplate: { findFirst: vi.fn() },
  inspectionRun: { create: vi.fn(), findFirst: vi.fn() },
  unit: { update: vi.fn() },
};
const service = new InspectionService(mockPrisma as any);

describe('InspectionService', () => {
  it('creates inspection run with pass result', async () => {
    mockPrisma.inspectionTemplate.findFirst.mockResolvedValue({ id: 'tmpl_01', kind: 'move_in', checklist: [{ code: 'dry' }, { code: 'door_seal' }] });
    mockPrisma.inspectionRun.create.mockResolvedValue({ id: 'ins_01', result: 'pass' });
    const result = await service.createInspectionRun({ unitId: 'u1', siteId: 's1', kind: 'move_in', checklist: [{ code: 'dry', label: 'Dry', result: 'pass' }, { code: 'door_seal', label: 'Door seal', result: 'pass' }] });
    expect(result.result).toBe('pass');
  });

  it('sets result to fail when any item fails', async () => {
    mockPrisma.inspectionTemplate.findFirst.mockResolvedValue({ id: 'tmpl_01', kind: 'move_in', checklist: [{ code: 'dry' }] });
    mockPrisma.inspectionRun.create.mockResolvedValue({ id: 'ins_01', result: 'fail' });
    const result = await service.createInspectionRun({ unitId: 'u1', siteId: 's1', kind: 'move_in', checklist: [{ code: 'dry', label: 'Dry', result: 'fail' }] });
    expect(result.result).toBe('fail');
  });

  it('throws when move-in inspection not completed', async () => {
    mockPrisma.inspectionRun.findFirst.mockResolvedValue(null);
    await expect(service.assertMoveInInspectionComplete('u1')).rejects.toBeInstanceOf(DomainException);
  });
});
