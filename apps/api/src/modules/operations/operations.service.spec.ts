import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperationsService } from './operations.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  task: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  incident: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  maintenanceOrder: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  unit: { findUniqueOrThrow: vi.fn() },
  transfer: { create: vi.fn() },
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { on: vi.fn(), emit: vi.fn() };

describe('OperationsService', () => {
  let service: OperationsService;

  beforeEach(() => {
    service = new OperationsService(mockPrisma as any, mockAudit as any, mockEventBus as any);
    vi.clearAllMocks();
  });

  describe('listTasks', () => {
    it('returns tasks for the organisation sites', async () => {
      const tasks = [{ id: 't1', title: 'Fix lock', status: 'open' }];
      mockPrisma.task.findMany.mockResolvedValue(tasks);
      const result = await service.listTasks('org1', {});
      expect(result).toEqual(tasks);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ site: { organisationId: 'org1' } }) }),
      );
    });
  });

  describe('updateTask', () => {
    it('throws NotFoundException when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);
      await expect(service.updateTask('org1', 't1', { status: 'done' })).rejects.toThrow(NotFoundException);
    });

    it('updates the task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ id: 't1', siteId: 's1' });
      mockPrisma.task.update.mockResolvedValue({ id: 't1', status: 'done' });
      const result = await service.updateTask('org1', 't1', { status: 'done' });
      expect(result).toEqual({ id: 't1', status: 'done' });
    });
  });

  describe('listIncidents', () => {
    it('returns incidents for the organisation', async () => {
      mockPrisma.incident.findMany.mockResolvedValue([{ id: 'i1' }]);
      const result = await service.listIncidents('org1', {});
      expect(result).toEqual([{ id: 'i1' }]);
    });
  });

  describe('updateIncident', () => {
    it('throws NotFoundException when incident not found', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue(null);
      await expect(service.updateIncident('org1', 'i1', { status: 'resolved' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMaintenanceOrders', () => {
    it('returns maintenance orders for the org', async () => {
      mockPrisma.maintenanceOrder.findMany.mockResolvedValue([{ id: 'm1' }]);
      const result = await service.listMaintenanceOrders('org1', {});
      expect(result).toEqual([{ id: 'm1' }]);
    });
  });
});
