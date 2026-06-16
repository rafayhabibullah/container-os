import { Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoiceDocumentService } from './invoice-document.service';

@Injectable()
export class InvoiceRunService {
  constructor(
    private prisma: PrismaClient,
    private eventBus: EventBusService,
    @Optional() private invoiceNumbers?: InvoiceNumberService,
    @Optional() private invoiceDocuments?: InvoiceDocumentService,
  ) {}

  calculateMonthlyPeriod(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async runForDate(date: Date, organisationId?: string): Promise<{ created: number; skipped: number; errors: number }> {
    let siteIdFilter: { in: string[] } | undefined;
    if (organisationId) {
      const sites = await this.prisma.site.findMany({ where: { organisationId }, select: { id: true } });
      siteIdFilter = { in: sites.map((s) => s.id) };
    }

    const agreements = await this.prisma.agreement.findMany({
      where: {
        status: 'active',
        billingCycle: 'monthly',
        ...(siteIdFilter ? { siteId: siteIdFilter } : {}),
      },
    });
    let created = 0, skipped = 0, errors = 0;

    for (const agreement of agreements) {
      try {
        const period = this.calculateMonthlyPeriod(date);
        const existing = await this.prisma.invoice.findFirst({ where: { agreementId: agreement.id, periodStart: period.start } });
        if (existing) { skipped++; continue; }

        const snapshot = agreement.pricingSnapshot as any;
        const amountMinor: number = snapshot.amountMinor ?? 0;
        const vatRate: number = snapshot.vatRate ?? 0.19;
        const vatMinor = Math.round(amountMinor * vatRate);
        const totalMinor = amountMinor + vatMinor;
        const dueDate = new Date(period.start);
        dueDate.setDate(dueDate.getDate() + 14);

        const site = this.invoiceNumbers
          ? await this.prisma.site.findUnique({ where: { id: agreement.siteId }, select: { organisationId: true } })
          : null;
        const invoiceNumber = site?.organisationId && this.invoiceNumbers ? await this.invoiceNumbers.next(site.organisationId, period.start) : undefined;
        const invoice = await this.prisma.invoice.upsert({
          where: { agreementId_periodStart: { agreementId: agreement.id, periodStart: period.start } },
          create: { agreementId: agreement.id, siteId: agreement.siteId, invoiceNumber, invoiceDate: period.start, issuedAt: new Date(), dueDate, periodStart: period.start, periodEnd: period.end, netMinor: amountMinor, vatMinor, totalMinor, locale: (agreement as any).language ?? 'de', currency: 'EUR' },
          update: {},
        });

        await this.prisma.invoiceLine.createMany({
          data: [
            { invoiceId: invoice.id, kind: 'rent', description: 'Monatsmiete', amountMinor, taxCode: 'DE_STD', vatRate },
            ...(vatMinor > 0 ? [{ invoiceId: invoice.id, kind: 'vat', description: 'MwSt 19%', amountMinor: vatMinor }] : []),
          ],
          skipDuplicates: true,
        });
        if (this.invoiceDocuments) await this.invoiceDocuments.generate(invoice.id);

        this.eventBus.emit({ type: Events.INVOICE_CREATED, payload: { invoiceId: invoice.id, agreementId: agreement.id, tenantId: (agreement as any).tenantId, totalMinor }, meta: { workspaceId: '', siteId: agreement.siteId, occurredAt: new Date() } });
        created++;
      } catch (e) {
        errors++;
        console.error(`Invoice run error for ${agreement.id}:`, e);
      }
    }
    return { created, skipped, errors };
  }
}
