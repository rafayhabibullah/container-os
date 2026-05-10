import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TemplateRendererService } from './template-renderer.service';
import { EmailService } from './email.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

interface SendNotificationParams { recipientId: string; locale: string; eventType: string; channel: 'email'; vars: Record<string, string>; subjectRef?: string; }

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(private prisma: PrismaClient, private renderer: TemplateRendererService, private email: EmailService, private eventBus: EventBusService) {}

  onModuleInit() {
    this.eventBus.on(Events.INVOICE_OVERDUE, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'invoice.overdue', channel: 'email', vars: { number: event.payload.invoiceId } }); });
    this.eventBus.on(Events.INVOICE_PAID, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'invoice.paid', channel: 'email', vars: {} }); });
    this.eventBus.on(Events.AGREEMENT_ACTIVATED, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId, locale: 'de', eventType: 'agreement.activated', channel: 'email', vars: {} }); });
    this.eventBus.on(Events.ACCESS_CREDENTIAL_ISSUED, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'access.credential.issued', channel: 'email', vars: { credential: event.payload.maskedValue ?? '' } }); });
  }

  async sendNotification(params: SendNotificationParams): Promise<void> {
    const pref = await this.prisma.notificationPreference.findFirst({ where: { userId: params.recipientId, channel: params.channel } });
    if (pref && !pref.enabled) return;

    const contact = await this.prisma.contact.findFirst({ where: { customerId: params.recipientId } });
    if (!contact?.email) return;

    const { subject, body } = await this.renderer.render(params.channel, params.locale, params.eventType, params.vars);
    const message = await this.prisma.outboundMessage.create({ data: { eventType: params.eventType, channel: params.channel, recipientId: params.recipientId, subjectRef: params.subjectRef } });
    await this.email.send({ to: contact.email, subject, html: body });
    await this.prisma.outboundMessage.update({ where: { id: message.id }, data: { status: 'sent', sentAt: new Date() } });
  }
}
