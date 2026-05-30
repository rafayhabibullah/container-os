import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

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
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId, deletedAt: null }, select: { id: true } });
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
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId, deletedAt: null }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    const agreements = await this.prisma.agreement.findMany({ where: { siteId: { in: siteIds } }, select: { tenantId: true } });
    const customerIds = [...new Set(agreements.map((a) => a.tenantId))];
    return this.prisma.customer.findMany({
      where: { id: { in: customerIds }, deletedAt: null },
      select: {
        id: true,
        type: true,
        personOrOrgData: true,
        createdAt: true,
        contacts: { where: { role: 'primary' }, select: { email: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
