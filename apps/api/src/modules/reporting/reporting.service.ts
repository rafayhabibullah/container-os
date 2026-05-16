import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaClient) {}

  private async getSites(orgId: string): Promise<{ id: string; name: string }[]> {
    return this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true, name: true } });
  }

  async getOccupancyReport(orgId: string) {
    const sites = await this.getSites(orgId);
    return Promise.all(sites.map(async ({ id: siteId, name: siteName }) => {
      const grouped = await this.prisma.unit.groupBy({ by: ['status'], where: { siteId, deletedAt: null }, _count: { status: true } });
      const total = grouped.reduce((s, g) => s + g._count.status, 0);
      const occupied = grouped.find((g) => g.status === 'occupied')?._count.status ?? 0;
      return { siteId, siteName, occupancyPct: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0, totalUnits: total, occupiedUnits: occupied };
    }));
  }

  async getRevenueReport(orgId: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return Promise.all(siteIds.map(async (siteId) => {
      const agg = await this.prisma.invoice.aggregate({ where: { siteId, status: 'paid', invoiceDate: { gte: from, lte: to } }, _sum: { totalMinor: true } });
      return { siteId, totalMinor: agg._sum.totalMinor ?? 0, currency: 'EUR' };
    }));
  }
}
