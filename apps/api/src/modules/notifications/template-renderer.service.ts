import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TemplateRendererService {
  constructor(private prisma: PrismaClient) {}

  async render(channel: string, locale: string, eventType: string, vars: Record<string, string>): Promise<{ subject: string; body: string }> {
    let template = await this.prisma.notificationTemplate.findFirst({ where: { channel, locale, eventType, active: true } });
    if (!template && locale !== 'en') template = await this.prisma.notificationTemplate.findFirst({ where: { channel, locale: 'en', eventType, active: true } });
    if (!template) throw new Error(`No notification template found for ${channel}/${locale}/${eventType}`);

    const substitute = (s: string) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, 'g'), v), s);
    return { subject: substitute(template.subject ?? ''), body: substitute(template.body) };
  }
}
