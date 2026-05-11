import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganisationGuard } from './organisation.guard';
import { ExecutionContext } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  organisationMember: {
    findFirst: vi.fn(),
  },
};

const makeContext = (user: object) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('OrganisationGuard', () => {
  let guard: OrganisationGuard;

  beforeEach(() => {
    guard = new OrganisationGuard(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  it('returns false when user has no organisationId', async () => {
    const result = await guard.canActivate(makeContext({ sub: 'u1' }));
    expect(result).toBe(false);
  });

  it('returns false when no active member found', async () => {
    mockPrisma.organisationMember.findFirst.mockResolvedValue(null);
    const result = await guard.canActivate(
      makeContext({ sub: 'u1', organisationId: 'org1' }),
    );
    expect(result).toBe(false);
  });

  it('returns false when organisation is suspended', async () => {
    mockPrisma.organisationMember.findFirst.mockResolvedValue({
      id: 'm1',
      organisation: { id: 'org1', status: 'suspended' },
    });
    const result = await guard.canActivate(
      makeContext({ sub: 'u1', organisationId: 'org1' }),
    );
    expect(result).toBe(false);
  });

  it('attaches organisation and member to request when valid', async () => {
    const member = {
      id: 'm1',
      organisation: { id: 'org1', status: 'active' },
    };
    mockPrisma.organisationMember.findFirst.mockResolvedValue(member);
    const req: any = { user: { sub: 'u1', organisationId: 'org1' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.organisation).toEqual(member.organisation);
    expect(req.member).toEqual(member);
  });
});
