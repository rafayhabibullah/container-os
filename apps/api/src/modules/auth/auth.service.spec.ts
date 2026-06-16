import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: { findUnique: vi.fn(), create: vi.fn() },
  organisation: { create: vi.fn() },
  organisationMember: { create: vi.fn(), findFirst: vi.fn() },
  userSession: { create: vi.fn(), findFirst: vi.fn() },
  invitation: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
};

const mockJwt = { sign: vi.fn().mockReturnValue('access.token.here') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockPrisma as any, mockJwt as unknown as JwtService);
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException if email already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({
          organisationName: 'Test GmbH',
          ownerName: 'Max',
          email: 'taken@test.de',
          password: 'pass1234',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user, organisation, and member in a transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const user = { id: 'u1', type: 'owner', email: 'new@test.de' };
      const org = { id: 'org1', status: 'active' };
      const member = { id: 'm1', organisationId: 'org1', userId: 'u1', role: 'owner' };
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn({
          user: { create: vi.fn().mockResolvedValue(user) },
          organisation: { create: vi.fn().mockResolvedValue(org) },
          organisationMember: { create: vi.fn().mockResolvedValue(member) },
          organisationSubscription: { create: vi.fn().mockResolvedValue({ id: 'sub1' }) },
        }),
      );
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await service.register({
        organisationName: 'New GmbH',
        ownerName: 'Max',
        email: 'new@test.de',
        password: 'pass1234',
      });

      expect(result.accessToken).toBe('access.token.here');
      expect(result.organisationId).toBe('org1');
      expect(result.role).toBe('owner');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nope@test.de', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 4);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: hash });
      await expect(
        service.login({ email: 'u@test.de', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('correct', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: hash,
        type: 'owner',
      });
      mockPrisma.organisationMember.findFirst.mockResolvedValue({
        id: 'm1',
        organisationId: 'org1',
        role: 'owner',
        userId: 'u1',
      });
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await service.login({ email: 'u@test.de', password: 'correct' });

      expect(result.accessToken).toBe('access.token.here');
      expect(result.role).toBe('owner');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException for invalid or expired token', async () => {
      mockPrisma.userSession.findFirst.mockResolvedValue(null);
      await expect(
        service.refresh({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns new tokens for valid refresh token', async () => {
      const user = { id: 'u1', type: 'owner', memberships: [{ organisationId: 'org1', role: 'owner', userId: 'u1' }] };
      mockPrisma.userSession.findFirst.mockResolvedValue({ user });
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await service.refresh({ refreshToken: 'valid-raw-token' });

      expect(result.accessToken).toBe('access.token.here');
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('invite', () => {
    it('creates an invitation and returns invitationId', async () => {
      mockPrisma.invitation.create.mockResolvedValue({ id: 'inv1' });

      const result = await service.invite('org1', 'u1', { email: 'op@test.de', role: 'operator' as any });

      expect(result.invitationId).toBe('inv1');
      expect(mockPrisma.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'op@test.de', organisationId: 'org1' }),
        }),
      );
    });
  });

  describe('validateInviteToken', () => {
    it('returns valid:false for unknown token', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      const result = await service.validateInviteToken('bad-token');
      expect(result.valid).toBe(false);
    });

    it('returns valid:true with metadata for a pending non-expired invitation', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue({
        email: 'x@test.de',
        role: 'operator',
        status: 'pending',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 100_000),
        organisation: { legalName: 'Test GmbH' },
      });
      const result = await service.validateInviteToken('good-token');
      expect(result.valid).toBe(true);
      expect(result.email).toBe('x@test.de');
    });
  });
});
