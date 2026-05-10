import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaClient) {}

  async getOccupancyReport(siteIds: string[], _from: Date, _to: Date) {
    return Promise.all(siteIds.map(async (siteId) => {
      const grouped = await this.prisma.unit.groupBy({ by: ['status'], where: { siteId, deletedAt: null }, _count: { status: true } });
      const total = grouped.reduce((s, g) => s + g._count.status, 0);
      const occupied = grouped.find((g) => g.status === 'occupied')?._count.status ?? 0;
      return { siteId, occupancyPct: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0, totalUnits: total, occupiedUnits: occupied };
    }));
  }

  async getRevenueReport(siteIds: string[], from: Date, to: Date) {
    return Promise.all(siteIds.map(async (siteId) => {
      const agg = await this.prisma.invoice.aggregate({ where: { siteId, status: 'paid', invoiceDate: { gte: from, lte: to } }, _sum: { totalMinor: true } });
      return { siteId, totalMinor: agg._sum.totalMinor ?? 0, from, to, currency: 'EUR' };
    }));
  }
}
