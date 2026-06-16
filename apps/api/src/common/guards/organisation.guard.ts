import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class OrganisationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string; organisationId?: string; type?: string };
    const requestedOrganisationId = request.params?.organisationId;

    if (!user?.sub || !user?.organisationId) return false;
    if (user.type === 'tenant') return false;
    if (requestedOrganisationId && requestedOrganisationId !== user.organisationId) {
      throw new ForbiddenException('Organisation scope mismatch');
    }

    const member = await this.prisma.organisationMember.findFirst({
      where: { userId: user.sub, organisationId: user.organisationId },
      include: { organisation: true },
    });

    if (!member || member.organisation.status !== 'active') return false;

    const scopedMember = member as typeof member & { siteIds?: string[]; allowedSiteIds?: string[] };
    const memberSiteIds = scopedMember.siteIds ?? [];
    scopedMember.allowedSiteIds = memberSiteIds;
    request.organisation = member.organisation;
    request.member = member;
    return true;
  }
}
