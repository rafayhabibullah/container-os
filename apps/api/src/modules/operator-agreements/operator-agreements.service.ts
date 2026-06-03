import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

interface ListAgreementsFilter { siteId?: string; unitId?: string; status?: string; }

@Injectable()
export class OperatorAgreementsService {
  constructor(private prisma: PrismaClient, private audit: AuditService) {}

  private async getSiteIds(organisationId: string): Promise<string[]> {
    const sites = await this.prisma.site.findMany({ where: { organisationId, deletedAt: null }, select: { id: true } });
    return sites.map((s) => s.id);
  }

  async listAgreements(organisationId: string, filter: ListAgreementsFilter) {
    const siteIds = await this.getSiteIds(organisationId);
    const agreements = await this.prisma.agreement.findMany({
      where: {
        siteId: { in: siteIds },
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.unitId ? { unitId: filter.unitId } : {}),
        ...(filter.status ? { status: filter.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const customerIds = [...new Set(agreements.map((a) => a.tenantId))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, personOrOrgData: true, contacts: { select: { email: true }, where: { role: 'primary' }, take: 1 } },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return agreements.map((a) => {
      const customer = customerMap.get(a.tenantId);
      const data = customer?.personOrOrgData as Record<string, string> | null;
      const customerName = data?.name ?? (data?.firstName || data?.lastName ? [data.firstName, data.lastName].filter(Boolean).join(' ') : null) ?? data?.companyName ?? null;
      return {
        ...a,
        customerName,
        customerEmail: customer?.contacts[0]?.email ?? null,
      };
    });
  }

  async getAgreement(organisationId: string, agreementId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const agreement = await this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, siteId: { in: siteIds } },
      include: { signatories: true, amendments: true },
    });

    const [unit, site] = await Promise.all([
      this.prisma.unit.findFirst({
        where: { id: agreement.unitId },
        select: { id: true, unitCode: true, kind: true, status: true, driveUp: true, conditionState: true },
      }),
      this.prisma.site.findFirst({
        where: { id: agreement.siteId },
        select: { id: true, name: true, slug: true, address: true, status: true, timezone: true, currency: true },
      }),
    ]);

    const unitType = unit
      ? await this.prisma.unitType.findFirst({
          where: { units: { some: { id: unit.id } } },
          select: { id: true, name: true, sizeSqm: true, sizeCbm: true, doorType: true, features: true },
        })
      : null;

    return { ...agreement, unit, unitType, site };
  }

  async sendForSignature(organisationId: string, agreementId: string, personIds: string[], actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    await this.prisma.agreement.findFirstOrThrow({ where: { id: agreementId, siteId: { in: siteIds } } });
    const updated = await this.prisma.agreement.update({ where: { id: agreementId }, data: { status: 'pending_signature' } });
    await this.prisma.signatory.createMany({ data: personIds.map((personId) => ({ agreementId, personId, status: 'pending' as const })) });
    await this.audit.record({ action: 'agreement.sent_for_signature', subjectType: 'Agreement', subjectId: agreementId, actorId, siteId: updated.siteId });
    return updated;
  }

  async requestTermination(organisationId: string, agreementId: string, requestedDate: Date, operatorNote: string | undefined, actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const agreement = await this.prisma.agreement.findFirstOrThrow({ where: { id: agreementId, siteId: { in: siteIds } } });
    const request = await this.prisma.terminationRequest.create({ data: { agreementId, requestedDate, operatorNote, status: 'pending' } });
    await this.audit.record({ action: 'agreement.termination_requested', subjectType: 'Agreement', subjectId: agreementId, actorId, siteId: agreement.siteId });
    return request;
  }
}
