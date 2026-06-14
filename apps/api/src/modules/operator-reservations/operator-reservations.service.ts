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
    const reservations = await this.prisma.reservation.findMany({
      where: {
        siteId: { in: siteIds },
        deletedAt: null,
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.status ? { status: filter.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const customerIds = [...new Set(reservations.map((r) => r.customerId))];
    const unitIds     = [...new Set(reservations.map((r) => r.unitId))];
    const unitTypeIds = [...new Set(reservations.map((r) => r.unitTypeId))];
    const siteIds2    = [...new Set(reservations.map((r) => r.siteId))];

    const [customers, units, unitTypes, sites] = await Promise.all([
      this.prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, personOrOrgData: true, contacts: { select: { email: true }, where: { role: 'primary' }, take: 1 } },
      }),
      this.prisma.unit.findMany({ where: { id: { in: unitIds } }, select: { id: true, unitCode: true } }),
      this.prisma.unitType.findMany({ where: { id: { in: unitTypeIds } }, select: { id: true, name: true } }),
      this.prisma.site.findMany({ where: { id: { in: siteIds2 } }, select: { id: true, name: true } }),
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const unitMap     = new Map(units.map((u) => [u.id, u]));
    const unitTypeMap = new Map(unitTypes.map((ut) => [ut.id, ut]));
    const siteMap     = new Map(sites.map((s) => [s.id, s]));

    return reservations.map((r) => {
      const customer = customerMap.get(r.customerId);
      const data     = customer?.personOrOrgData as Record<string, string> | null;
      const customerName = data?.name ?? (data?.firstName || data?.lastName ? [data.firstName, data.lastName].filter(Boolean).join(' ') : null) ?? data?.companyName ?? null;
      return {
        ...r,
        customerName,
        customerEmail:  customer?.contacts[0]?.email ?? null,
        siteName:       siteMap.get(r.siteId)?.name ?? null,
        unitTypeName:   unitTypeMap.get(r.unitTypeId)?.name ?? null,
        unitCode:       unitMap.get(r.unitId)?.unitCode ?? null,
      };
    });
  }

  async getReservationDetails(organisationId: string, reservationId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const r = await this.prisma.reservation.findFirstOrThrow({ where: { id: reservationId, siteId: { in: siteIds } } });

    const [customer, unit, unitType, site] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: r.customerId },
        select: { id: true, type: true, personOrOrgData: true, contacts: { select: { email: true, phone: true }, where: { role: 'primary' }, take: 1 } },
      }),
      this.prisma.unit.findFirst({
        where: { id: r.unitId },
        select: { id: true, unitCode: true, kind: true, status: true, driveUp: true, conditionState: true, photoUrl: true },
      }),
      this.prisma.unitType.findFirst({
        where: { id: r.unitTypeId },
        select: { id: true, name: true, sizeSqm: true, sizeCbm: true, doorType: true, features: true },
      }),
      this.prisma.site.findFirst({
        where: { id: r.siteId },
        select: { id: true, name: true, slug: true, address: true, status: true, timezone: true, currency: true },
      }),
    ]);

    const data = customer?.personOrOrgData as Record<string, string> | null;
    const customerName = data?.name ?? (data?.firstName || data?.lastName ? [data.firstName, data.lastName].filter(Boolean).join(' ') : null) ?? data?.companyName ?? null;
    return {
      ...r,
      customerName,
      customerEmail: customer?.contacts[0]?.email ?? null,
      customerPhone: customer?.contacts[0]?.phone ?? null,
      customerType:  customer?.type ?? null,
      unit,
      unitType,
      site,
    };
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
    const agreementData = {
      tenantId: reservation.customerId,
      unitId: reservation.unitId,
      siteId: reservation.siteId,
      billingCycle: input.billingCycle,
      language: input.language,
      pricingSnapshot: input.pricingSnapshot,
      terminationRules,
    };
    const agreement = await this.prisma.agreement.upsert({
      where: { reservationId },
      create: { reservationId, ...agreementData },
      update: agreementData,
    });
    await this.prisma.reservation.update({ where: { id: reservationId }, data: { status: 'converted' } });
    await this.audit.record({ action: 'agreement.drafted', subjectType: 'Agreement', subjectId: agreement.id, actorId, siteId: reservation.siteId });
    return { agreementId: agreement.id, status: agreement.status };
  }
}
