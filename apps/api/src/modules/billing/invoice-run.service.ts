import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

@Injectable()
export class InvoiceRunService {
  constructor(private prisma: PrismaClient, private eventBus: EventBusService) {}

  calculateMonthlyPeriod(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async runForDate(date: Date, organisationId?: string): Promise<{ created: number; skipped: number; errors: number }> {
    const agreements = await this.prisma.agreement.findMany({
      where: {
        status: 'active',
        billingCycle: 'monthly',
        ...(organisationId ? { site: { organisationId } } : {}),
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

        const invoice = await this.prisma.invoice.upsert({
          where: { agreementId_periodStart: { agreementId: agreement.id, periodStart: period.start } },
          create: { agreementId: agreement.id, siteId: agreement.siteId, invoiceDate: period.start, dueDate, periodStart: period.start, periodEnd: period.end, totalMinor, currency: 'EUR' },
          update: {},
        });

        await this.prisma.invoiceLine.createMany({
          data: [
            { invoiceId: invoice.id, kind: 'rent', description: 'Monatsmiete', amountMinor, taxCode: 'DE_STD', vatRate },
            ...(vatMinor > 0 ? [{ invoiceId: invoice.id, kind: 'vat', description: 'MwSt 19%', amountMinor: vatMinor }] : []),
          ],
          skipDuplicates: true,
        });

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
