import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

@Injectable()
export class DelinquencyService {
  constructor(private prisma: PrismaClient, private eventBus: EventBusService) {}

  async checkOverdueInvoices(siteId: string): Promise<void> {
    const policy = await this.prisma.delinquencyPolicy.findFirst({ where: { siteId } });
    const overdueDays = policy?.overdueDays ?? 14;
    const threshold = new Date(Date.now() - overdueDays * 24 * 60 * 60 * 1000);
    const unpaid = await this.prisma.invoice.findMany({ where: { siteId, status: 'pending', dueDate: { lt: threshold } } });
    for (const invoice of unpaid) {
      await this.prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'overdue' } });
      this.eventBus.emit({ type: Events.INVOICE_OVERDUE, payload: { invoiceId: invoice.id, agreementId: invoice.agreementId, tenantId: (invoice as any).tenantId }, meta: { workspaceId: '', siteId, occurredAt: new Date() } });
    }
  }

  async markPaid(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'paid' } });
    this.eventBus.emit({ type: Events.INVOICE_PAID, payload: { invoiceId, agreementId: invoice.agreementId }, meta: { workspaceId: '', siteId: invoice.siteId, occurredAt: new Date() } });
  }
}
