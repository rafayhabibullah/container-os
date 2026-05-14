import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

interface ListReservationsFilter { siteId?: string; status?: string; }
interface CreateAgreementInput { billingCycle: 'monthly' | 'fixed_term'; language: 'de' | 'en'; pricingSnapshot: object; terminationRules?: object; }

@Injectable()
export class OperatorReservationsService {
  constructor(private prisma: PrismaClient, private audit: AuditService) {}

  private async getSiteIds(organisationId: string): Promise<string[]> {
    const sites = await this.prisma.site.findMany({ where: { organisationId, deletedAt: null }, select: { id: true } });
    return sites.map((s) => s.id);
  }

  async listReservations(organisationId: string, filter: ListReservationsFilter) {
    const siteIds = await this.getSiteIds(organisationId);
    return this.prisma.reservation.findMany({
      where: {
        siteId: { in: siteIds },
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.status ? { status: filter.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReservationStatus(organisationId: string, reservationId: string, status: string, actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const reservation = await this.prisma.reservation.findFirstOrThrow({ where: { id: reservationId, siteId: { in: siteIds } } });
    const updated = await this.prisma.reservation.update({ where: { id: reservationId }, data: { status: status as any } });
    await this.audit.record({ action: `reservation.${status}`, subjectType: 'Reservation', subjectId: reservationId, actorId, siteId: reservation.siteId });
    return updated;
  }

  async createAgreementFromReservation(organisationId: string, reservationId: string, input: CreateAgreementInput, actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const reservation = await this.prisma.reservation.findFirstOrThrow({ where: { id: reservationId, siteId: { in: siteIds } } });
    const terminationRules = input.terminationRules ?? (input.billingCycle === 'monthly' ? { noticeDays: 30 } : { noticeDays: 30, minimumMonths: 3 });
    const agreement = await this.prisma.agreement.create({
      data: {
        reservationId,
        tenantId: reservation.customerId,
        unitId: reservation.unitId,
        siteId: reservation.siteId,
        billingCycle: input.billingCycle,
        language: input.language,
        pricingSnapshot: input.pricingSnapshot,
        terminationRules,
      },
    });
    await this.prisma.reservation.update({ where: { id: reservationId }, data: { status: 'converted' } });
    await this.audit.record({ action: 'agreement.drafted', subjectType: 'Agreement', subjectId: agreement.id, actorId, siteId: reservation.siteId });
    return { agreementId: agreement.id, status: agreement.status };
  }
}
