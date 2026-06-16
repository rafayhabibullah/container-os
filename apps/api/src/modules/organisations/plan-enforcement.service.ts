import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes, PLAN_LIMITS, OrgPlan } from '@sitelager/domain-types';

export type PlanFeature = 'basic_agreements' | 'billing' | 'tenant_portal' | 'operations' | 'reporting' | 'api_webhooks' | 'priority_support';

const PLAN_FEATURES: Record<OrgPlan, PlanFeature[]> = {
  free: ['basic_agreements'],
  starter: ['basic_agreements', 'billing', 'tenant_portal'],
  professional: ['basic_agreements', 'billing', 'tenant_portal', 'operations', 'reporting', 'api_webhooks'],
  enterprise: ['basic_agreements', 'billing', 'tenant_portal', 'operations', 'reporting', 'api_webhooks', 'priority_support'],
};

@Injectable()
export class PlanEnforcementService {
  constructor(private readonly prisma: PrismaClient) {}

  private async getOrg(orgId: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('ORGANISATION_NOT_FOUND');
    return org;
  }

  async getUsage(orgId: string) {
    const org = await this.getOrg(orgId);
    const plan = org.plan as OrgPlan;
    const limits = PLAN_LIMITS[plan];

    const [sitesUsed, unitsUsed] = await Promise.all([
      this.prisma.site.count({ where: { organisationId: orgId, deletedAt: null } }),
      this.prisma.unit.count({ where: { site: { organisationId: orgId }, deletedAt: null } }),
    ]);

    return {
      plan,
      sites: { used: sitesUsed, limit: limits.maxSites },
      units: { used: unitsUsed, limit: limits.maxUnits },
    };
  }

  async getEntitlements(orgId: string) {
    const org = await this.getOrg(orgId);
    return { plan: org.plan, features: PLAN_FEATURES[org.plan as OrgPlan] };
  }

  async assertFeature(orgId: string, feature: PlanFeature) {
    const org = await this.getOrg(orgId);
    const plan = org.plan as OrgPlan;
    if (!PLAN_FEATURES[plan].includes(feature)) {
      throw new DomainException(ErrorCodes.PLAN_LIMIT_EXCEEDED, `Feature '${feature}' requires a paid plan`, { feature, plan });
    }
  }

  async assertCanCreateSite(orgId: string) {
    const org = await this.getOrg(orgId);
    const plan = org.plan as OrgPlan;
    const limits = PLAN_LIMITS[plan];

    const sitesUsed = await this.prisma.site.count({ where: { organisationId: orgId, deletedAt: null } });
    if (sitesUsed >= limits.maxSites) {
      throw new DomainException(
        ErrorCodes.PLAN_LIMIT_EXCEEDED,
        `Plan '${plan}' allows a maximum of ${limits.maxSites} site(s)`,
        { resource: 'site', plan, limit: limits.maxSites, used: sitesUsed },
      );
    }
  }

  async assertCanCreateUnit(orgId: string) {
    const org = await this.getOrg(orgId);
    const plan = org.plan as OrgPlan;
    const limits = PLAN_LIMITS[plan];

    const unitsUsed = await this.prisma.unit.count({ where: { site: { organisationId: orgId }, deletedAt: null } });
    if (unitsUsed >= limits.maxUnits) {
      throw new DomainException(
        ErrorCodes.PLAN_LIMIT_EXCEEDED,
        `Plan '${plan}' allows a maximum of ${limits.maxUnits} unit(s)`,
        { resource: 'unit', plan, limit: limits.maxUnits, used: unitsUsed },
      );
    }
  }
}
