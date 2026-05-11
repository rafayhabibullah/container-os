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
      mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
        fn({
          user: { create: vi.fn().mockResolvedValue(user) },
          organisation: { create: vi.fn().mockResolvedValue(org) },
          organisationMember: { create: vi.fn().mockResolvedValue(member) },
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
      const hash = await bcrypt.hash('correct', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: hash });
      await expect(
        service.login({ email: 'u@test.de', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('correct', 12);
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
});
