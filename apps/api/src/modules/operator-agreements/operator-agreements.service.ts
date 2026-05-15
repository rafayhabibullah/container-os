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
    return this.prisma.agreement.findMany({
      where: {
        siteId: { in: siteIds },
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.unitId ? { unitId: filter.unitId } : {}),
        ...(filter.status ? { status: filter.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgreement(organisationId: string, agreementId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    return this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, siteId: { in: siteIds } },
      include: { signatories: true, amendments: true },
    });
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
