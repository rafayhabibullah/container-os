import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { MollieAdapter } from '../payments/mollie.adapter';

@Injectable()
export class TenantPortalService {
  constructor(private prisma: PrismaClient, private billing?: BillingService, private mollie?: MollieAdapter) {}

  // Agreement.tenantId is Customer.id, but the JWT sub is User.id.
  // One email can have multiple Contact records (e.g. separate checkout flows), so resolve all.
  private async resolveCustomerIds(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const contacts = await this.prisma.contact.findMany({
      where: { email: user.email, deletedAt: null },
      select: { customerId: true },
    });
    return [...new Set(contacts.map((c) => c.customerId))];
  }

  async listMyAgreements(userId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    const agreements = await this.prisma.agreement.findMany({
      where: { tenantId: { in: customerIds }, status: { in: ['active', 'signed', 'pending_signature'] }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const unitIds = [...new Set(agreements.map((a) => a.unitId))];
    const siteIds = [...new Set(agreements.map((a) => a.siteId))];

    const [units, sites] = await Promise.all([
      this.prisma.unit.findMany({ where: { id: { in: unitIds } }, include: { unitType: true } }),
      this.prisma.site.findMany({ where: { id: { in: siteIds } }, select: { id: true, name: true, address: true } }),
    ]);

    const unitMap = Object.fromEntries(units.map((u) => [u.id, u]));
    const siteMap = Object.fromEntries(sites.map((s) => [s.id, s]));

    return agreements.map((a) => ({ ...a, unit: unitMap[a.unitId] ?? null, site: siteMap[a.siteId] ?? null }));
  }

  async getMyAgreement(userId: string, agreementId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    const agreement = await this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId: { in: customerIds } },
      include: {
        signatories: true,
        amendments: true,
        customer: { include: { contacts: { where: { role: 'primary' }, take: 1 } } },
      },
    });
    const [unit, site] = await Promise.all([
      this.prisma.unit.findUnique({ where: { id: agreement.unitId }, include: { unitType: true } }),
      this.prisma.site.findUnique({ where: { id: agreement.siteId } }),
    ]);
    return { ...agreement, unit, site };
  }

  async listMyInvoices(userId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    const agreements = await this.prisma.agreement.findMany({
      where: { tenantId: { in: customerIds }, deletedAt: null },
      select: { id: true },
    });
    const agreementIds = agreements.map((a) => a.id);
    return this.prisma.invoice.findMany({
      where: { agreementId: { in: agreementIds }, deletedAt: null },
      orderBy: { dueDate: 'desc' },
    });
  }

  async createMyInvoicePayment(userId: string, invoiceId: string, redirectUrl?: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    const invoice = await this.prisma.invoice.findFirstOrThrow({
      where: {
        id: invoiceId,
        deletedAt: null,
        agreement: { tenantId: { in: customerIds } },
        status: { in: ['pending', 'sent', 'overdue'] },
      },
      include: { agreement: true },
    });
    const target = redirectUrl ?? `${process.env.APP_URL ?? 'http://localhost:3001'}/my-storage/invoices/${invoiceId}`;
    if (!this.billing || !this.mollie) throw new Error('Payment checkout is not configured');
    return this.billing.createMolliePayment(invoice.id, this.mollie, target);
  }

  async listMyMandates(userId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    return this.prisma.mandate.findMany({
      where: { customerId: { in: customerIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        scheme: true,
        status: true,
        ibanLast4: true,
        signedAt: true,
      },
    });
  }

  async signMyAgreement(userId: string, agreementId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    const agreement = await this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId: { in: customerIds }, status: 'pending_signature' },
      select: { id: true, siteId: true },
    });
    // personId on signatories is the customerId, not the userId
    const updated = await this.prisma.signatory.updateMany({
      where: { agreementId: agreement.id, personId: { in: customerIds }, status: { not: 'signed' } },
      data: { status: 'signed', signedAt: new Date() },
    });
    if (updated.count === 0) {
      await this.prisma.signatory.create({ data: { agreementId: agreement.id, personId: customerIds[0], status: 'signed', signedAt: new Date() } });
    }
    const signatories = await this.prisma.signatory.findMany({ where: { agreementId: agreement.id } });
    if (signatories.every((s) => s.status === 'signed')) {
      await this.prisma.agreement.update({ where: { id: agreement.id }, data: { status: 'signed' } });
      await this.prisma.backgroundJob.create({
        data: { kind: 'rental.activate-ready', payload: { agreementId: agreement.id, actorId: userId } },
      }).catch(() => undefined);
    }
    return { agreementId: agreement.id, signed: true };
  }

  async createMoveOutRequest(userId: string, agreementId: string, requestedDate: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    await this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId: { in: customerIds } },
      select: { id: true },
    });
    return this.prisma.terminationRequest.create({
      data: {
        agreementId,
        requestedDate: new Date(requestedDate),
        status: 'pending',
      },
    });
  }

  async getDashboardSummary(userId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    const agreements = await this.prisma.agreement.findMany({
      where: { tenantId: { in: customerIds } },
      select: { id: true },
    });
    const agreementIds = agreements.map((a) => a.id);

    const [overdueInvoices, nextInvoice] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { agreementId: { in: agreementIds }, status: 'overdue' },
        select: { id: true, dueDate: true, totalMinor: true, currency: true, agreementId: true },
      }),
      this.prisma.invoice.findFirst({
        where: { agreementId: { in: agreementIds }, status: { in: ['pending', 'sent'] } },
        orderBy: { dueDate: 'asc' },
        select: { id: true, dueDate: true, totalMinor: true, currency: true },
      }),
    ]);

    return { overdueInvoices, nextInvoice };
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    const contact = await this.prisma.contact.findFirst({
      where: { email: user.email, role: 'primary' },
      select: { phone: true },
    });
    return { ...user, phone: contact?.phone ?? null };
  }

  async updateMyProfile(userId: string, data: { name?: string; phone?: string }) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
    await Promise.all([
      data.name !== undefined
        ? this.prisma.user.update({ where: { id: userId }, data: { name: data.name } })
        : Promise.resolve(),
      data.phone !== undefined
        ? this.prisma.contact.updateMany({
            where: { email: user.email, role: 'primary' },
            data: { phone: data.phone },
          })
        : Promise.resolve(),
    ]);
    return this.getMyProfile(userId);
  }

  async reportIncident(userId: string, params: { agreementId: string; type: string; description: string }) {
    const customerIds = await this.resolveCustomerIds(userId);
    const agreement = await this.prisma.agreement.findFirstOrThrow({
      where: { id: params.agreementId, tenantId: { in: customerIds } },
      select: { id: true, siteId: true, unitId: true },
    });
    const unitExists = agreement.unitId
      ? await this.prisma.unit.findUnique({ where: { id: agreement.unitId }, select: { id: true } })
      : null;
    const incident = await this.prisma.incident.create({
      data: { siteId: agreement.siteId, unitId: unitExists ? agreement.unitId : undefined, tenantId: customerIds[0], severity: 'low', type: params.type, description: params.description, photoIds: [] },
    });
    const task = await this.prisma.task.create({
      data: {
        siteId: agreement.siteId,
        unitId: agreement.unitId,
        tenantId: customerIds[0],
        title: `Tenant report: ${params.type}`,
        notes: params.description,
        priority: 'normal',
        subjectRef: `Incident:${incident.id}`,
      },
    });
    return { incidentId: incident.id, taskId: task.id };
  }
}
