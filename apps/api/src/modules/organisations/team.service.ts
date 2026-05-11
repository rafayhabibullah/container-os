import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaClient) {}

  async listMembers(orgId: string) {
    return this.prisma.organisationMember.findMany({
      where: { organisationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeMember(orgId: string, memberId: string, requestingRole: string, requestingUserId: string) {
    if (requestingRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');

    const member = await this.prisma.organisationMember.findFirst({
      where: { id: memberId, organisationId: orgId },
    });
    if (!member) throw new NotFoundException('MEMBER_NOT_FOUND');
    if (member.userId === requestingUserId) throw new BadRequestException('CANNOT_REMOVE_SELF');

    await this.prisma.organisationMember.delete({ where: { id: memberId } });
  }

  async listInvitations(orgId: string, requestingRole: string) {
    if (requestingRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.invitation.findMany({
      where: { organisationId: orgId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(orgId: string, invitationId: string, requestingRole: string) {
    if (requestingRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');

    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organisationId: orgId, status: 'pending' },
    });
    if (!invitation) throw new NotFoundException('INVITATION_NOT_FOUND');

    await this.prisma.invitation.update({ where: { id: invitationId }, data: { status: 'revoked' } });
  }
}
