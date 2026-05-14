import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';

@Injectable()
export class UnitTypeService {
  constructor(private readonly prisma: PrismaClient) {}

  async listUnitTypes(_orgId: string, siteId: string) {
    return this.prisma.unitType.findMany({
      where: { siteId },
      orderBy: { sizeSqm: 'asc' },
    });
  }

  async createUnitType(_orgId: string, siteId: string, dto: CreateUnitTypeDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.unitType.create({
      data: {
        siteId,
        name: dto.name,
        sizeSqm: dto.sizeSqm,
        sizeCbm: dto.sizeCbm,
        doorType: dto.doorType,
        features: dto.features ?? [],
      },
    });
  }

  private async findUnitType(siteId: string, unitTypeId: string) {
    const unitType = await this.prisma.unitType.findFirst({ where: { id: unitTypeId, siteId } });
    if (!unitType) throw new NotFoundException('UNIT_TYPE_NOT_FOUND');
    return unitType;
  }

  async updateUnitType(_orgId: string, siteId: string, unitTypeId: string, dto: UpdateUnitTypeDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findUnitType(siteId, unitTypeId);
    return this.prisma.unitType.update({ where: { id: unitTypeId }, data: dto });
  }

  async deleteUnitType(_orgId: string, siteId: string, unitTypeId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findUnitType(siteId, unitTypeId);
    await this.prisma.unitType.delete({ where: { id: unitTypeId } });
  }
}
