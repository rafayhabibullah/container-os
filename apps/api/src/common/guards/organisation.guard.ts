import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class OrganisationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string; organisationId?: string; type?: string };

    if (!user?.sub || !user?.organisationId) return false;
    if (user.type === 'tenant') return false;

    const member = await this.prisma.organisationMember.findFirst({
      where: { userId: user.sub, organisationId: user.organisationId },
      include: { organisation: true },
    });

    if (!member || member.organisation.status !== 'active') return false;

    request.organisation = member.organisation;
    request.member = member;
    return true;
  }
}
