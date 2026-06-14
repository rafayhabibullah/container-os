import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TemplateRendererService } from './template-renderer.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

export type NotificationChannel = 'email' | 'sms' | 'push';

export const NOTIFICATION_EVENT_TYPES = ['invoice.overdue', 'invoice.paid', 'agreement.activated', 'access.credential.issued'] as const;
export const NOTIFICATION_CHANNELS: NotificationChannel[] = ['email', 'sms', 'push'];

interface SendNotificationParams { recipientId: string; locale: string; eventType: string; channel: NotificationChannel; vars: Record<string, string>; subjectRef?: string; }

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private prisma: PrismaClient,
    private renderer: TemplateRendererService,
    private email: EmailService,
    private eventBus: EventBusService,
    private sms: SmsService,
    private push: PushService,
  ) {}

  onModuleInit() {
    this.eventBus.on(Events.INVOICE_OVERDUE, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'invoice.overdue', channel: 'email', vars: { number: event.payload.invoiceId } }); });
    this.eventBus.on(Events.INVOICE_PAID, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'invoice.paid', channel: 'email', vars: {} }); });
    this.eventBus.on(Events.AGREEMENT_ACTIVATED, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId, locale: 'de', eventType: 'agreement.activated', channel: 'email', vars: {} }); });
    this.eventBus.on(Events.ACCESS_CREDENTIAL_ISSUED, async (event: any) => { await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'access.credential.issued', channel: 'email', vars: { credential: event.payload.maskedValue ?? '' } }); });
  }

  private async isEnabled(recipientId: string, eventType: string, channel: NotificationChannel): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findFirst({ where: { userId: recipientId, eventType, channel } });
    if (pref && !pref.enabled) return false;
    return true;
  }

  async sendNotification(params: SendNotificationParams): Promise<void> {
    if (!(await this.isEnabled(params.recipientId, params.eventType, params.channel))) return;

    const contact = await this.prisma.contact.findFirst({ where: { customerId: params.recipientId } });

    const { subject, body } = await this.renderer.render(params.channel, params.locale, params.eventType, params.vars);
    const message = await this.prisma.outboundMessage.create({ data: { eventType: params.eventType, channel: params.channel, recipientId: params.recipientId, subjectRef: params.subjectRef } });

    if (params.channel === 'email') {
      if (!contact?.email) return;
      await this.email.send({ to: contact.email, subject, html: body });
    } else if (params.channel === 'sms') {
      if (!contact?.phone) return;
      await this.sms.send({ to: contact.phone, body });
    } else if (params.channel === 'push') {
      await this.push.send({ to: params.recipientId, title: subject, body });
    }

    await this.prisma.outboundMessage.update({ where: { id: message.id }, data: { status: 'sent', sentAt: new Date() } });
  }

  async listPreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const map = new Map(existing.map((p) => [`${p.eventType}:${p.channel}`, p]));
    const result: { eventType: string; channel: NotificationChannel; enabled: boolean }[] = [];
    for (const eventType of NOTIFICATION_EVENT_TYPES) {
      for (const channel of NOTIFICATION_CHANNELS) {
        const existingPref = map.get(`${eventType}:${channel}`);
        result.push({ eventType, channel, enabled: existingPref ? existingPref.enabled : true });
      }
    }
    return result;
  }

  async upsertPreference(userId: string, eventType: string, channel: NotificationChannel, enabled: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_eventType_channel: { userId, eventType, channel } },
      update: { enabled },
      create: { userId, eventType, channel, enabled },
    });
  }
}
