import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { PlanEnforcementService } from './plan-enforcement.service';

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly planEnforcement: PlanEnforcementService,
  ) {}

  async listSites(orgId: string) {
    return this.prisma.site.findMany({
      where: { organisationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSite(orgId: string, dto: CreateSiteDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.planEnforcement.assertCanCreateSite(orgId);
    const slug = slugify(dto.name, { lower: true, strict: true });
    try {
      return await this.prisma.site.create({
        data: {
          name: dto.name,
          address: dto.address,
          timezone: dto.timezone ?? 'Europe/Berlin',
          currency: dto.currency ?? 'EUR',
          slug,
          organisationId: orgId,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('SLUG_ALREADY_EXISTS');
      throw e;
    }
  }

  async getSite(orgId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, organisationId: orgId, deletedAt: null },
    });
    if (!site) throw new NotFoundException('SITE_NOT_FOUND');
    return site;
  }

  async updateSite(orgId: string, siteId: string, dto: UpdateSiteDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.getSite(orgId, siteId);
    return this.prisma.site.update({ where: { id: siteId }, data: dto });
  }

  async deleteSite(orgId: string, siteId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.getSite(orgId, siteId);
    await this.prisma.site.update({ where: { id: siteId }, data: { deletedAt: new Date() } });
  }

  async listUnits(orgId: string, siteId: string) {
    await this.getSite(orgId, siteId);
    return this.prisma.unit.findMany({
      where: { siteId, deletedAt: null },
      include: { unitType: true },
      orderBy: { unitCode: 'asc' },
    });
  }

  async getUnit(orgId: string, siteId: string, unitId: string) {
    await this.getSite(orgId, siteId);
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, siteId, deletedAt: null },
      include: { unitType: true },
    });
    if (!unit) throw new NotFoundException('UNIT_NOT_FOUND');
    return unit;
  }

  async createUnit(orgId: string, siteId: string, data: { unitCode: string; unitTypeId: string; kind: string; driveUp: boolean }) {
    await this.getSite(orgId, siteId);
    await this.planEnforcement.assertCanCreateUnit(orgId);
    try {
      return await this.prisma.unit.create({
        data: { siteId, ...data } as any,
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('UNIT_CODE_ALREADY_EXISTS');
      if (e.code === 'P2003') throw new BadRequestException('INVALID_UNIT_TYPE');
      throw e;
    }
  }

  async patchUnit(orgId: string, siteId: string, unitId: string, data: { unitCode?: string; driveUp?: boolean; status?: string }) {
    await this.getUnit(orgId, siteId, unitId);
    return this.prisma.unit.update({ where: { id: unitId }, data: data as any });
  }

  async softDeleteUnit(orgId: string, siteId: string, unitId: string) {
    await this.getUnit(orgId, siteId, unitId);
    await this.prisma.unit.update({ where: { id: unitId }, data: { deletedAt: new Date() } });
  }
}
