import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaClient) {}

  async getAvailability(siteId: string, _startDate: Date) {
    const [units, unitTypes] = await Promise.all([
      this.prisma.unit.findMany({ where: { siteId, deletedAt: null } }),
      this.prisma.unitType.findMany({ where: { siteId } }),
    ]);
    const typeMap = new Map(unitTypes.map((ut) => [ut.id, ut]));
    const byType = new Map<string, { unitTypeId: string; unitTypeName: string; sizeSqm: number | null; availableCount: number; totalCount: number }>();
    for (const unit of units) {
      const ut = typeMap.get(unit.unitTypeId);
      const entry = byType.get(unit.unitTypeId) ?? {
        unitTypeId: unit.unitTypeId,
        unitTypeName: ut?.name ?? unit.unitTypeId,
        sizeSqm: ut?.sizeSqm ?? null,
        availableCount: 0,
        totalCount: 0,
      };
      entry.totalCount++;
      if (unit.status === 'available') entry.availableCount++;
      byType.set(unit.unitTypeId, entry);
    }
    return Array.from(byType.values());
  }
}
