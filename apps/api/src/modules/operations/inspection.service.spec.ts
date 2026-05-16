import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InspectionService } from './inspection.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  inspectionTemplate: { findFirst: vi.fn() },
  inspectionRun: { create: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  unit: { update: vi.fn() },
};
const service = new InspectionService(mockPrisma as any);

describe('InspectionService', () => {
  beforeEach(() => vi.clearAllMocks());

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

  describe('completeInspectionRun', () => {
    it('sets result to pass when all checklist items pass', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_01', unitId: 'u1', kind: 'routine' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_01', result: 'pass' });
      const result = await service.completeInspectionRun('ins_01', {
        checklist: [{ code: 'DOOR', label: 'Door', result: 'pass' }, { code: 'LOCK', label: 'Lock', result: 'pass' }],
      });
      expect(result.result).toBe('pass');
      expect(mockPrisma.inspectionRun.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'ins_01' },
        data: expect.objectContaining({ result: 'pass', completedAt: expect.any(Date) }),
      }));
    });

    it('sets result to fail when any checklist item fails', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_02', unitId: 'u1', kind: 'routine' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_02', result: 'fail' });
      const result = await service.completeInspectionRun('ins_02', {
        checklist: [{ code: 'DOOR', label: 'Door', result: 'pass' }, { code: 'LOCK', label: 'Lock', result: 'fail' }],
      });
      expect(result.result).toBe('fail');
    });

    it('updates unit status to available on move_out pass', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_03', unitId: 'u2', kind: 'move_out' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_03', result: 'pass' });
      await service.completeInspectionRun('ins_03', {
        checklist: [{ code: 'EMPTY', label: 'Empty', result: 'pass' }],
      });
      expect(mockPrisma.unit.update).toHaveBeenCalledWith({ where: { id: 'u2' }, data: { status: 'available' } });
    });

    it('updates unit status to maintenance on move_out fail', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_04', unitId: 'u2', kind: 'move_out' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_04', result: 'fail' });
      await service.completeInspectionRun('ins_04', {
        checklist: [{ code: 'EMPTY', label: 'Empty', result: 'fail' }],
      });
      expect(mockPrisma.unit.update).toHaveBeenCalledWith({ where: { id: 'u2' }, data: { status: 'maintenance' } });
    });

    it('does not update unit status for non-move_out inspections', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_05', unitId: 'u3', kind: 'move_in' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_05', result: 'pass' });
      await service.completeInspectionRun('ins_05', {
        checklist: [{ code: 'DOOR', label: 'Door', result: 'pass' }],
      });
      expect(mockPrisma.unit.update).not.toHaveBeenCalled();
    });
  });
});
