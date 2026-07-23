import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { ImportExistingTenantDto } from './dto/import-existing-tenant.dto';

@Injectable()
export class OrganisationService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrganisation(orgId: string) {
    return this.prisma.organisation.findUniqueOrThrow({ where: { id: orgId } });
  }

  async updateOrganisation(orgId: string, dto: UpdateOrganisationDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.organisation.update({ where: { id: orgId }, data: dto });
  }

  async getCustomer(orgId: string, customerId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId, deletedAt: null }, select: { id: true, name: true } });
    const siteIds = sites.map((s) => s.id);
    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, deletedAt: null, agreements: { some: { siteId: { in: siteIds } } } },
      select: {
        id: true, type: true, personOrOrgData: true, createdAt: true,
        contacts: { select: { email: true, phone: true, role: true }, orderBy: { role: 'asc' } },
        agreements: {
          where: { siteId: { in: siteIds } },
          select: { id: true, status: true, siteId: true, unitId: true, effectiveFrom: true, billingCycle: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    const siteNames = await this.prisma.site.findMany({
      where: { id: { in: [...new Set(customer.agreements.map((a) => a.siteId))] } },
      select: { id: true, name: true },
    });
    const siteMap = new Map(siteNames.map((s) => [s.id, s.name]));
    return {
      ...customer,
      agreements: customer.agreements.map((a) => ({ ...a, siteName: siteMap.get(a.siteId) ?? a.siteId })),
    };
  }

  async listCustomers(orgId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId, deletedAt: null }, select: { id: true, name: true } });
    const siteIds = sites.map((s) => s.id);
    const agreements = await this.prisma.agreement.findMany({ where: { siteId: { in: siteIds } }, select: { tenantId: true } });
    const customerIds = [...new Set(agreements.map((a) => a.tenantId))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, deletedAt: null },
      select: {
        id: true,
        type: true,
        personOrOrgData: true,
        createdAt: true,
        contacts: { where: { role: 'primary' }, select: { email: true }, take: 1 },
        agreements: {
          where: { siteId: { in: siteIds }, deletedAt: null },
          select: {
            id: true,
            status: true,
            siteId: true,
            unitId: true,
            effectiveFrom: true,
            billingCycle: true,
            pricingSnapshot: true,
            invoices: {
              where: { status: 'paid' },
              select: { periodEnd: true },
              orderBy: { periodEnd: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const unitIds = [
      ...new Set(customers.flatMap((customer) => customer.agreements.map((agreement) => agreement.unitId))),
    ];
    const units = await this.prisma.unit.findMany({
      where: { id: { in: unitIds } },
      select: { id: true, unitCode: true },
    });
    const unitMap = new Map(units.map((unit) => [unit.id, unit.unitCode]));
    const siteMap = new Map(sites.map((s) => [s.id, s.name]));
    return customers.map((customer: any) => {
      const activeAgreement = customer.agreements.find((agreement: any) => agreement.status === 'active') ?? customer.agreements[0] ?? null;
      return {
        ...customer,
        activeAgreement: activeAgreement
          ? {
              id: activeAgreement.id,
              status: activeAgreement.status,
              siteId: activeAgreement.siteId,
              siteName: siteMap.get(activeAgreement.siteId) ?? activeAgreement.siteId,
              unitId: activeAgreement.unitId,
              unitCode: unitMap.get(activeAgreement.unitId) ?? activeAgreement.unitId,
              effectiveFrom: activeAgreement.effectiveFrom,
              billingCycle: activeAgreement.billingCycle,
              monthlyRentMinor: activeAgreement.pricingSnapshot?.amountMinor ?? null,
              paidThroughDate: activeAgreement.invoices[0]?.periodEnd ?? activeAgreement.pricingSnapshot?.importedPaidThroughDate ?? null,
            }
          : null,
      };
    });
  }

  listTenants(orgId: string) {
    return this.listCustomers(orgId);
  }

  getTenant(orgId: string, tenantId: string) {
    return this.getCustomer(orgId, tenantId);
  }

  async importExistingTenant(orgId: string, dto: ImportExistingTenantDto, actorId?: string) {
    const moveInDate = this.startOfDay(dto.moveInDate);
    const paidThroughDate = this.endOfDay(dto.paidThroughDate);
    if (paidThroughDate < moveInDate) throw new BadRequestException('PAID_THROUGH_BEFORE_MOVE_IN');

    const site = await this.prisma.site.findFirst({
      where: { id: dto.siteId, organisationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!site) throw new NotFoundException('SITE_NOT_FOUND');

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, siteId: dto.siteId, deletedAt: null },
      select: { id: true, unitCode: true, unitTypeId: true, status: true },
    });
    if (!unit) throw new NotFoundException('UNIT_NOT_FOUND');

    const activeAgreement = await this.prisma.agreement.findFirst({
      where: { unitId: dto.unitId, status: { in: ['active', 'signed', 'pending_signature'] }, deletedAt: null },
      select: { id: true },
    });
    if (activeAgreement) throw new BadRequestException('UNIT_ALREADY_ASSIGNED');

    const vatRate = dto.vatRate ?? 0.19;
    const paymentMethod = dto.paymentMethod ?? 'bank_transfer';
    const billingPeriods = this.monthlyPeriods(moveInDate, paidThroughDate);

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          type: dto.type,
          personOrOrgData: dto.type === 'business'
            ? { companyName: dto.companyName, name: dto.companyName }
            : { firstName: dto.firstName, lastName: dto.lastName, name: [dto.firstName, dto.lastName].filter(Boolean).join(' ') },
        },
      });

      await tx.contact.create({
        data: { customerId: customer.id, role: 'primary', email: dto.email, phone: dto.phone || undefined },
      });

      const reservation = await tx.reservation.create({
        data: {
          siteId: dto.siteId,
          unitId: dto.unitId,
          unitTypeId: unit.unitTypeId,
          customerId: customer.id,
          status: 'converted',
          source: 'legacy_import',
          startDate: moveInDate,
          expiresAt: new Date(),
        },
      });

      const agreement = await tx.agreement.create({
        data: {
          reservationId: reservation.id,
          tenantId: customer.id,
          unitId: dto.unitId,
          siteId: dto.siteId,
          status: 'active',
          billingCycle: 'monthly',
          effectiveFrom: moveInDate,
          terminationRules: { noticePeriodDays: 30, source: 'legacy_import' },
          pricingSnapshot: {
            amountMinor: dto.monthlyRentMinor,
            vatRate,
            importedPaidThroughDate: paidThroughDate.toISOString(),
            nextBillingDate: this.nextDay(paidThroughDate).toISOString(),
          },
          language: 'de',
        },
      });

      await tx.signatory.create({ data: { agreementId: agreement.id, personId: customer.id, status: 'signed', signedAt: moveInDate } });
      await tx.unit.update({ where: { id: dto.unitId }, data: { status: 'occupied' } });

      for (const period of billingPeriods) {
        const netMinor = dto.monthlyRentMinor;
        const vatMinor = Math.round(netMinor * vatRate);
        const totalMinor = netMinor + vatMinor;
        const invoice = await tx.invoice.upsert({
          where: { agreementId_periodStart: { agreementId: agreement.id, periodStart: period.start } },
          create: {
            agreementId: agreement.id,
            siteId: dto.siteId,
            status: 'paid',
            invoiceDate: period.start,
            issuedAt: period.start,
            dueDate: period.start,
            currency: 'EUR',
            locale: 'de',
            netMinor,
            vatMinor,
            totalMinor,
            periodStart: period.start,
            periodEnd: period.end,
            einvoicePayload: { source: 'legacy_import', paidOutsideSiteLager: true },
          },
          update: { status: 'paid' },
        });

        await tx.invoiceLine.createMany({
          data: [
            { invoiceId: invoice.id, kind: 'rent', description: 'Legacy monthly rent import', amountMinor: netMinor, taxCode: 'DE_STD', vatRate },
            ...(vatMinor > 0 ? [{ invoiceId: invoice.id, kind: 'vat', description: 'MwSt 19%', amountMinor: vatMinor, vatRate }] : []),
          ],
          skipDuplicates: true,
        });

        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            method: paymentMethod,
            status: 'succeeded',
            amountMinor: totalMinor,
            reference: `legacy-${agreement.id}-${period.start.toISOString().slice(0, 10)}`,
          },
        });
      }

      await tx.activity.create({
        data: {
          subjectType: 'Tenant',
          subjectId: customer.id,
          channel: 'operator_note',
          actorId,
          body: [
            `Legacy tenant imported and assigned to unit ${unit.unitCode}.`,
            `Paid through ${paidThroughDate.toISOString().slice(0, 10)}.`,
            dto.notes,
          ].filter(Boolean).join(' '),
        },
      });

      return {
        tenant: customer,
        agreement,
        importedPaidInvoices: billingPeriods.length,
        paidThroughDate: paidThroughDate.toISOString(),
        nextBillingDate: this.nextDay(paidThroughDate).toISOString(),
      };
    });
  }

  private startOfDay(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('INVALID_DATE');
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('INVALID_DATE');
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private nextDay(value: Date) {
    const date = new Date(value);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private monthlyPeriods(from: Date, through: Date) {
    const periods: { start: Date; end: Date }[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(through.getFullYear(), through.getMonth(), 1);
    while (cursor <= last) {
      const start = new Date(cursor);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      periods.push({ start, end });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return periods;
  }
}
