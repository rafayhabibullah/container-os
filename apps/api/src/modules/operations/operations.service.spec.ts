import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperationsService } from './operations.service';

const mockPrisma = {
  task: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  incident: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  maintenanceOrder: { create: vi.fn(), findMany: vi.fn() },
  site: { findMany: vi.fn() },
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { on: vi.fn(), emit: vi.fn() };

let service: OperationsService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new OperationsService(mockPrisma as any, mockAudit as any, mockEventBus as any);
});

describe('OperationsService.createTask', () => {
  it('creates a task with organisationId, type, and priority', async () => {
    mockPrisma.task.create.mockResolvedValue({ id: 't1', status: 'open' });
    await service.createTask({
      organisationId: 'org1',
      siteId: 's1',
      title: 'Inspect unit 12',
      type: 'inspect_unit',
      priority: 'high',
    });
    expect(mockPrisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: 'org1',
        type: 'inspect_unit',
        priority: 'high',
      }),
    });
  });

  it('creates a task with optional unitId, tenantId, bookingId', async () => {
    mockPrisma.task.create.mockResolvedValue({ id: 't2', status: 'open' });
    await service.createTask({
      organisationId: 'org1',
      siteId: 's1',
      title: 'Move-in task',
      unitId: 'u1',
      tenantId: 'ten1',
      bookingId: 'bk1',
    });
    expect(mockPrisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ unitId: 'u1', tenantId: 'ten1', bookingId: 'bk1' }),
    });
  });

  it('returns the created task', async () => {
    const mockTask = { id: 't1', status: 'open', siteId: 's1', title: 'Test' };
    mockPrisma.task.create.mockResolvedValue(mockTask);
    const result = await service.createTask({ siteId: 's1', title: 'Test' });
    expect(result).toEqual(mockTask);
  });

  it('records audit log when task is created', async () => {
    mockPrisma.task.create.mockResolvedValue({ id: 't1', siteId: 's1' });
    await service.createTask({ siteId: 's1', title: 'Test' });
    expect(mockAudit.record).toHaveBeenCalledWith({
      action: 'task.created',
      subjectType: 'Task',
      subjectId: 't1',
      siteId: 's1',
    });
  });
});

describe('OperationsService.resolveIncident', () => {
  it('completes the linked task when resolving an incident', async () => {
    mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.incident.update.mockResolvedValue({ id: 'inc1', status: 'resolved' });

    await service.resolveIncident('inc1', 'Fixed the gate lock.');

    expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
      where: { subjectRef: 'Incident:inc1', status: { notIn: ['completed', 'cancelled'] } },
      data: { status: 'completed' },
    });
    expect(mockPrisma.incident.update).toHaveBeenCalledWith({
      where: { id: 'inc1' },
      data: { status: 'resolved', resolutionNote: 'Fixed the gate lock.' },
    });
  });

  it('completes the task before updating the incident', async () => {
    const order: string[] = [];
    mockPrisma.task.updateMany.mockImplementation(async () => { order.push('task'); return { count: 1 }; });
    mockPrisma.incident.update.mockImplementation(async () => { order.push('incident'); return {}; });

    await service.resolveIncident('inc1', 'note');

    expect(order).toEqual(['task', 'incident']);
  });

  it('throws when resolution note is blank', async () => {
    await expect(service.resolveIncident('inc1', '  ')).rejects.toThrow('Resolution note is required');
    expect(mockPrisma.task.updateMany).not.toHaveBeenCalled();
  });
});

describe('OperationsService.updateIncident', () => {
  beforeEach(() => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 's1' }]);
    mockPrisma.incident.findFirst.mockResolvedValue({ id: 'inc1', siteId: 's1' });
    mockPrisma.incident.update.mockResolvedValue({ id: 'inc1', status: 'resolved' });
    mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
  });

  it('completes the linked task when status is set to resolved', async () => {
    await service.updateIncident('org1', 'inc1', { status: 'resolved' });

    expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
      where: { subjectRef: 'Incident:inc1', status: { notIn: ['completed', 'cancelled'] } },
      data: { status: 'completed' },
    });
  });

  it('does not touch tasks when status is not resolved', async () => {
    await service.updateIncident('org1', 'inc1', { status: 'investigating' });

    expect(mockPrisma.task.updateMany).not.toHaveBeenCalled();
  });

  it('throws INCIDENT_NOT_FOUND when incident does not belong to org', async () => {
    mockPrisma.incident.findFirst.mockResolvedValue(null);

    await expect(service.updateIncident('org1', 'inc1', { status: 'resolved' })).rejects.toThrow('INCIDENT_NOT_FOUND');
    expect(mockPrisma.task.updateMany).not.toHaveBeenCalled();
  });
});

describe('OperationsService.updateTask', () => {
  it('allows transitioning to blocked status', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 's1' }]);
    mockPrisma.task.findFirst.mockResolvedValue({ id: 't1', siteId: 's1' });
    mockPrisma.task.update.mockResolvedValue({ id: 't1', status: 'blocked' });
    const result = await service.updateTask('org1', 't1', { status: 'blocked' });
    expect(result.status).toBe('blocked');
  });
});
