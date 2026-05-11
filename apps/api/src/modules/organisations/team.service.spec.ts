import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamService } from './team.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  organisationMember: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  invitation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

describe('TeamService', () => {
  let service: TeamService;

  beforeEach(() => {
    service = new TeamService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listMembers', () => {
    it('returns all members with user info', async () => {
      const members = [{ id: 'm1', role: 'owner', user: { id: 'u1', name: 'Max', email: 'max@test.de' } }];
      mockPrisma.organisationMember.findMany.mockResolvedValue(members);

      const result = await service.listMembers('org1');

      expect(result).toEqual(members);
      expect(mockPrisma.organisationMember.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('removeMember', () => {
    it('throws ForbiddenException when requesting role is operator', async () => {
      await expect(service.removeMember('org1', 'm1', 'operator', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when member is not in the organisation', async () => {
      mockPrisma.organisationMember.findFirst.mockResolvedValue(null);
      await expect(service.removeMember('org1', 'm1', 'owner', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when owner attempts to remove their own membership', async () => {
      mockPrisma.organisationMember.findFirst.mockResolvedValue({ id: 'm1', userId: 'u1', organisationId: 'org1' });
      await expect(service.removeMember('org1', 'm1', 'owner', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('removes member when owner removes a different user', async () => {
      mockPrisma.organisationMember.findFirst.mockResolvedValue({ id: 'm1', userId: 'u2', organisationId: 'org1' });
      mockPrisma.organisationMember.delete.mockResolvedValue({});

      await service.removeMember('org1', 'm1', 'owner', 'u1');

      expect(mockPrisma.organisationMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });
  });

  describe('listInvitations', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.listInvitations('org1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('returns pending invitations for owner', async () => {
      const invitations = [{ id: 'inv1', email: 'new@test.de', status: 'pending' }];
      mockPrisma.invitation.findMany.mockResolvedValue(invitations);

      const result = await service.listInvitations('org1', 'owner');

      expect(result).toEqual(invitations);
      expect(mockPrisma.invitation.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1', status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('revokeInvitation', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.revokeInvitation('org1', 'inv1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when invitation not found', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      await expect(service.revokeInvitation('org1', 'inv1', 'owner')).rejects.toThrow(NotFoundException);
    });

    it('sets invitation status to revoked', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue({ id: 'inv1', organisationId: 'org1', status: 'pending' });
      mockPrisma.invitation.update.mockResolvedValue({});

      await service.revokeInvitation('org1', 'inv1', 'owner');

      expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { status: 'revoked' },
      });
    });
  });
});
