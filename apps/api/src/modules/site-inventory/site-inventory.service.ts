import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  available:      ['reserved', 'maintenance', 'out_of_service'],
  reserved:       ['available', 'occupied', 'maintenance'],
  occupied:       ['maintenance'],
  maintenance:    ['available', 'out_of_service'],
  out_of_service: ['maintenance'],
};

@Injectable()
export class SiteInventoryService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditService,
    private eventBus: EventBusService,
  ) {}

  async getSites() {
    return this.prisma.site.findMany({ where: { deletedAt: null } });
  }

  async getSiteBySlug(slug: string) {
    return this.prisma.site.findFirst({ where: { slug, deletedAt: null } });
  }

  async createUnit(data: { siteId: string; unitCode: string; unitTypeId: string; kind: string; driveUp: boolean; zoneId?: string; position?: object }) {
    try {
      const unit = await this.prisma.unit.create({ data: { ...data, kind: data.kind as any, status: 'available' } });
      await this.audit.record({ action: 'unit.created', subjectType: 'Unit', subjectId: unit.id, siteId: data.siteId });
      return unit;
    } catch (e: any) {
      if (e.code === 'P2002') throw new DomainException(ErrorCodes.UNIT_CODE_DUPLICATE, `Unit code ${data.unitCode} already exists in this site`);
      throw e;
    }
  }

  async transitionUnitStatus(unitId: string, to: string, actorId: string, reason: string) {
    const unit = await this.prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
    const allowed = ALLOWED_TRANSITIONS[unit.status] ?? [];
    if (!allowed.includes(to)) {
      throw new DomainException(ErrorCodes.UNIT_NOT_AVAILABLE, `Cannot transition unit from ${unit.status} to ${to}`, { unitId, from: unit.status, to });
    }
    const updated = await this.prisma.unit.update({
      where: { id: unitId, auditVersion: unit.auditVersion },
      data: { status: to as any, auditVersion: { increment: 1 } },
    });
    await this.prisma.inventoryEvent.create({ data: { unitId, oldStatus: unit.status, newStatus: to, reason, actorId } });
    await this.audit.record({ action: 'unit.status_changed', subjectType: 'Unit', subjectId: unitId, changes: { from: unit.status, to }, actorId, siteId: unit.siteId });
    return updated;
  }

  async deleteUnit(unitId: string, _actorId: string) {
    if (await this.audit.hasLegalHold('Unit', unitId)) throw new DomainException(ErrorCodes.LEGAL_HOLD_ACTIVE, `Unit ${unitId} has an active legal hold`);
    return this.prisma.unit.update({ where: { id: unitId }, data: { deletedAt: new Date() } });
  }

  async getUnits(siteId: string) {
    return this.prisma.unit.findMany({ where: { siteId, deletedAt: null } });
  }
}
