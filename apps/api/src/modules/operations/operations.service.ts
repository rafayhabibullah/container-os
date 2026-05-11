import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';

@Injectable()
export class OperationsService {
  constructor(private prisma: PrismaClient, private audit: AuditService, private eventBus: EventBusService) {
    eventBus.on(Events.ACCESS_DENIED, async (event: any) => { await this.createIncident({ siteId: event.meta.siteId, severity: 'medium', type: 'unauthorized_access', linkedAccessEventId: event.payload.accessEventId }); });
  }

  async createTask(params: { siteId: string; title: string; assigneeId?: string; subjectRef?: string; dueAt?: Date }) {
    const task = await this.prisma.task.create({ data: params });
    await this.audit.record({ action: 'task.created', subjectType: 'Task', subjectId: task.id, siteId: params.siteId });
    return task;
  }

  async createIncident(params: { siteId: string; severity: string; type: string; linkedAccessEventId?: string }) {
    const incident = await this.prisma.incident.create({ data: params });
    const task = await this.createTask({ siteId: params.siteId, title: `Incident: ${params.type}`, subjectRef: `Incident:${incident.id}` });
    return { incidentId: incident.id, taskId: task.id };
  }

  async resolveIncident(incidentId: string, resolutionNote: string) {
    if (!resolutionNote?.trim()) throw new Error('Resolution note is required');
    return this.prisma.incident.update({ where: { id: incidentId }, data: { status: 'resolved', resolutionNote } });
  }

  async getOpenIncidents(siteId: string) {
    return this.prisma.incident.findMany({ where: { siteId, status: { in: ['open', 'investigating'] } }, orderBy: { createdAt: 'desc' } });
  }

  async createTransfer(fromUnitId: string, toUnitId: string, agreementId: string, effectiveDate: Date) {
    const target = await this.prisma.unit.findUniqueOrThrow({ where: { id: toUnitId } });
    if (target.status !== 'available') throw new DomainException(ErrorCodes.TRANSFER_TARGET_UNAVAILABLE, `Unit ${toUnitId} is not available`);
    const transfer = await this.prisma.transfer.create({ data: { fromUnitId, toUnitId, agreementId, effectiveDate } });
    await this.audit.record({ action: 'transfer.created', subjectType: 'Transfer', subjectId: transfer.id });
    return transfer;
  }
}
