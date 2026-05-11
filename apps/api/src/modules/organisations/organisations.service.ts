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
}
