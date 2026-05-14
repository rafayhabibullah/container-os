import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnitTypeService } from './unit-type.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  unitType: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('UnitTypeService', () => {
  let service: UnitTypeService;

  beforeEach(() => {
    service = new UnitTypeService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listUnitTypes', () => {
    it('returns unit types for the site', async () => {
      const types = [{ id: 'ut1', siteId: 's1', name: 'Small 5m²' }];
      mockPrisma.unitType.findMany.mockResolvedValue(types);

      const result = await service.listUnitTypes('org1', 's1');

      expect(result).toEqual(types);
      expect(mockPrisma.unitType.findMany).toHaveBeenCalledWith({
        where: { siteId: 's1' },
        orderBy: { sizeSqm: 'asc' },
      });
    });
  });

  describe('createUnitType', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.createUnitType('org1', 's1', { name: 'Small', sizeSqm: 5 }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates unit type when role is owner', async () => {
      const created = { id: 'ut1', siteId: 's1', name: 'Small', sizeSqm: 5 };
      mockPrisma.unitType.create.mockResolvedValue(created);

      const result = await service.createUnitType('org1', 's1', { name: 'Small', sizeSqm: 5 }, 'owner');

      expect(result).toEqual(created);
      expect(mockPrisma.unitType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ siteId: 's1', name: 'Small', sizeSqm: 5 }),
      });
    });
  });

  describe('updateUnitType', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.updateUnitType('org1', 's1', 'ut1', { name: 'New' }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when unit type not found', async () => {
      mockPrisma.unitType.findFirst.mockResolvedValue(null);
      await expect(
        service.updateUnitType('org1', 's1', 'ut1', { name: 'New' }, 'owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates unit type when owner', async () => {
      mockPrisma.unitType.findFirst.mockResolvedValue({ id: 'ut1', siteId: 's1' });
      mockPrisma.unitType.update.mockResolvedValue({ id: 'ut1', name: 'New' });

      const result = await service.updateUnitType('org1', 's1', 'ut1', { name: 'New' }, 'owner');

      expect(result).toEqual({ id: 'ut1', name: 'New' });
    });
  });

  describe('deleteUnitType', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.deleteUnitType('org1', 's1', 'ut1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('deletes unit type when owner', async () => {
      mockPrisma.unitType.findFirst.mockResolvedValue({ id: 'ut1', siteId: 's1' });
      mockPrisma.unitType.delete.mockResolvedValue({});

      await service.deleteUnitType('org1', 's1', 'ut1', 'owner');

      expect(mockPrisma.unitType.delete).toHaveBeenCalledWith({ where: { id: 'ut1' } });
    });
  });
});
