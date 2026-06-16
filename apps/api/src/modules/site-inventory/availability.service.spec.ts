import { describe, it, expect, vi } from 'vitest';
import { AvailabilityService } from './availability.service';

const mockPrisma = {
  unit: { findMany: vi.fn() },
  unitType: { findMany: vi.fn().mockResolvedValue([
    { id: 'ut1', name: 'Small', sizeSqm: 5 },
    { id: 'ut2', name: 'Large', sizeSqm: 10 },
  ]) },
};
const service = new AvailabilityService(mockPrisma as any);

describe('AvailabilityService', () => {
  it('groups available units by unitTypeId', async () => {
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: 'u1', unitTypeId: 'ut1', status: 'available' },
      { id: 'u2', unitTypeId: 'ut1', status: 'available' },
      { id: 'u3', unitTypeId: 'ut2', status: 'available' },
    ]);
    const result = await service.getAvailability('s1', new Date());
    expect(result.find((r: any) => r.unitTypeId === 'ut1')?.availableCount).toBe(2);
  });

  it('excludes occupied units', async () => {
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: 'u1', unitTypeId: 'ut1', status: 'available' },
      { id: 'u2', unitTypeId: 'ut1', status: 'occupied' },
    ]);
    const result = await service.getAvailability('s1', new Date());
    expect(result.find((r: any) => r.unitTypeId === 'ut1')?.availableCount).toBe(1);
  });
});
