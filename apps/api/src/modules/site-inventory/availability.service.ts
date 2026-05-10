import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaClient) {}

  async getAvailability(siteId: string, _startDate: Date) {
    const units = await this.prisma.unit.findMany({ where: { siteId, deletedAt: null } });
    const byType = new Map<string, { unitTypeId: string; availableCount: number; totalCount: number }>();
    for (const unit of units) {
      const entry = byType.get(unit.unitTypeId) ?? { unitTypeId: unit.unitTypeId, availableCount: 0, totalCount: 0 };
      entry.totalCount++;
      if (unit.status === 'available') entry.availableCount++;
      byType.set(unit.unitTypeId, entry);
    }
    return Array.from(byType.values());
  }
}
