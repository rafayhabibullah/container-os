import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DeduplicationService } from './deduplication.service';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';

interface CreateLeadInput { siteId: string; name: string; email: string; phone?: string; source: string; intent?: string; moveInDate?: Date; marketingConsent?: boolean; }

@Injectable()
export class CrmLeadsService {
  constructor(private prisma: PrismaClient, private dedup: DeduplicationService, private audit: AuditService, private eventBus: EventBusService) {}

  async createLead(input: CreateLeadInput) {
    let customerId: string;
    const existing = await this.dedup.findDuplicate(input.email, input.phone);
    if (existing) {
      customerId = existing.customerId;
    } else {
      const customer = await this.prisma.customer.create({ data: { personOrOrgData: { name: input.name, email: input.email, phone: input.phone }, marketingConsent: input.marketingConsent ?? false } });
      await this.prisma.contact.create({ data: { customerId: customer.id, email: input.email, phone: input.phone } });
      customerId = customer.id;
    }
    const lead = await this.prisma.lead.create({ data: { siteId: input.siteId, source: input.source, intent: input.intent, moveInDate: input.moveInDate, customerId } });
    await this.audit.record({ action: 'lead.created', subjectType: 'Lead', subjectId: lead.id, siteId: input.siteId });
    return { leadId: lead.id, customerId, status: lead.status, nextSuggestedAction: 'contact_within_15m' };
  }

  async getLeads(siteId: string, status?: string) {
    return this.prisma.lead.findMany({ where: { siteId, deletedAt: null, ...(status ? { status: status as any } : {}) }, orderBy: { createdAt: 'desc' } });
  }
}
