import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaClient) {}

  async listSites(orgId: string) {
    return this.prisma.site.findMany({
      where: { organisationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSite(orgId: string, dto: CreateSiteDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
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
}
