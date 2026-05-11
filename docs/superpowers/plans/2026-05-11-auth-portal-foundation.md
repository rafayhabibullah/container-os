# Auth & Portal Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Keycloak with email/password JWT auth, add the Organisation model to the schema, and create a unified Next.js portal with login/register/invite-acceptance pages and role-based route protection.

**Architecture:** Email/password + bcrypt (cost 12) + JWT (15-min access token signed with `JWT_SECRET`). Opaque refresh tokens stored as SHA-256 hashes in `UserSession.tokenHash`. `OrganisationGuard` validates the JWT and confirms an active `OrganisationMember` row on every protected route. A single Next.js app (`apps/web/`) serves all user types; `middleware.ts` reads the JWT from a cookie and redirects by role. The three old portals (`web-owner`, `web-operator`, `web-tenant`) remain untouched until a later plan.

**Tech Stack:** NestJS 10, Prisma 5, `@nestjs/jwt`, `passport-jwt`, `bcryptjs`, `slugify`, Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui

---

## Plan Scope (1 of 6)

This plan covers **Milestone 2 (Auth & RBAC)** and the Organisation model from **Milestone 3**.

| Later plan | Covers |
|---|---|
| Plan 2 | Org/Site/Team management UI, site CRUD, invitation management pages |
| Plan 3 | Units, Listings, Marketplace Search |
| Plan 4 | Booking, Tenant Portal |
| Plan 5 | Contracts, Invoices, Mollie Payments |
| Plan 6 | Operations, Reports, Admin, Hardening |

---

## File Map

### Modified
- `apps/api/prisma/schema.prisma` — add `Organisation`, `OrganisationMember`, `Invitation`; update `User` (add `passwordHash`, drop `keycloakId`); add `tokenHash` to `UserSession`; add `organisationId` to `Site`
- `apps/api/src/modules/auth/auth.service.ts` — full rewrite: email/password register/login/refresh/invite/accept-invite
- `apps/api/src/modules/auth/auth.controller.ts` — add all 5 auth endpoints
- `apps/api/src/modules/auth/auth.module.ts` — register JwtModule, drop Keycloak
- `apps/api/src/modules/auth/auth.service.spec.ts` — replace Keycloak tests with email/password tests
- `apps/api/src/common/guards/auth.guard.ts` — update to use new JWT strategy
- `docker-compose.yml` — remove keycloak service
- `docker-compose.full.yml` — remove keycloak, add `web` service (unified portal)
- `.env.example` — remove KEYCLOAK_*, add `JWT_SECRET`, `REFRESH_SECRET`
- `pnpm-workspace.yaml` — add `apps/web`

### New (backend)
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/api/src/modules/auth/dto/register.dto.ts`
- `apps/api/src/modules/auth/dto/login.dto.ts`
- `apps/api/src/modules/auth/dto/refresh.dto.ts`
- `apps/api/src/modules/auth/dto/invite.dto.ts`
- `apps/api/src/modules/auth/dto/accept-invite.dto.ts`
- `apps/api/src/common/guards/organisation.guard.ts`
- `apps/api/src/common/decorators/current-member.decorator.ts`

### New (apps/web — unified portal)
- `apps/web/package.json`
- `apps/web/next.config.js`
- `apps/web/tsconfig.json`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`
- `apps/web/src/middleware.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/register/page.tsx`
- `apps/web/src/app/accept-invite/page.tsx`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/my-storage/page.tsx`
- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/Dockerfile`

---

## Task 1: Prisma Schema — Organisation, OrganisationMember, Invitation

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add new enums before the Auth section (line ~797)**

Find the `// ─── Auth & RBAC` comment and insert before it:

```prisma
// ─── Organisation ────────────────────────────────────────────────────────────

enum OrganisationStatus {
  active
  suspended
}

enum OrgPlan {
  starter
  professional
  enterprise
}

enum MemberRole {
  owner
  operator
  tenant
}

enum InvitationStatus {
  pending
  accepted
  expired
  revoked
}

model Organisation {
  id              String             @id @default(cuid())
  legalName       String
  tradingName     String?
  slug            String             @unique
  countryCode     String             @default("DE")
  defaultLanguage String             @default("de")
  currency        String             @default("EUR")
  vatId           String?
  taxNumber       String?
  billingEmail    String
  supportEmail    String?
  phone           String?
  website         String?
  status          OrganisationStatus @default(active)
  plan            OrgPlan            @default(starter)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  members     OrganisationMember[]
  invitations Invitation[]
  sites       Site[]
}

model OrganisationMember {
  id             String     @id @default(cuid())
  organisationId String
  userId         String
  role           MemberRole
  createdAt      DateTime   @default(now())

  organisation Organisation @relation(fields: [organisationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([organisationId, userId])
  @@index([organisationId])
  @@index([userId])
}

model Invitation {
  id              String           @id @default(cuid())
  organisationId  String
  email           String
  role            MemberRole
  tokenHash       String           @unique
  status          InvitationStatus @default(pending)
  expiresAt       DateTime
  acceptedAt      DateTime?
  invitedByUserId String?
  createdAt       DateTime         @default(now())

  organisation Organisation @relation(fields: [organisationId], references: [id])

  @@index([organisationId])
}
```

- [ ] **Step 2: Update the User model**

Replace the existing `User` model block with:

```prisma
model User {
  id           String   @id @default(cuid())
  type         UserType
  email        String   @unique
  name         String?
  passwordHash String?
  mfaState     String   @default("disabled")
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  assignments PermissionAssignment[]
  sessions    UserSession[]
  memberships OrganisationMember[]
}
```

- [ ] **Step 3: Add tokenHash to UserSession**

Find the `UserSession` model and add `tokenHash`:

```prisma
model UserSession {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  device    String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

- [ ] **Step 4: Add organisationId to Site**

In the `Site` model, add after `id`:

```prisma
  organisationId String?
  organisation   Organisation? @relation(fields: [organisationId], references: [id])
```

And add `@@index([organisationId])` to the Site model.

- [ ] **Step 5: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name add_organisation_auth
```

Expected: Migration created and applied. Prisma client regenerated.

- [ ] **Step 6: Verify schema compiles**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(schema): add Organisation, OrganisationMember, Invitation; update User auth fields"
```

---

## Task 2: Install Backend Auth Dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install bcryptjs and slugify**

```bash
cd apps/api
pnpm add bcryptjs slugify
pnpm add -D @types/bcryptjs
```

Expected: Both packages appear in `apps/api/package.json` dependencies.

- [ ] **Step 2: Verify @nestjs/jwt is already present**

```bash
grep "@nestjs/jwt" package.json
```

Expected: `"@nestjs/jwt": "^10.2.0"` — already installed. No action needed.

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "chore(api): add bcryptjs and slugify dependencies"
```

---

## Task 3: JWT Strategy (Replace Keycloak)

**Files:**
- Create: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Delete: `apps/api/src/modules/auth/keycloak.strategy.ts`

- [ ] **Step 1: Create the JWT strategy**

Create `apps/api/src/modules/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  organisationId: string;
  role: string;
  type: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.organisationId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
```

- [ ] **Step 2: Update auth.guard.ts to use 'jwt' strategy**

Replace contents of `apps/api/src/common/guards/auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 3: Delete the Keycloak strategy**

```bash
rm apps/api/src/modules/auth/keycloak.strategy.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/strategies/
git add apps/api/src/common/guards/auth.guard.ts
git rm apps/api/src/modules/auth/keycloak.strategy.ts
git commit -m "feat(auth): replace Keycloak strategy with email/password JWT strategy"
```

---

## Task 4: OrganisationGuard

**Files:**
- Create: `apps/api/src/common/guards/organisation.guard.ts`
- Create: `apps/api/src/common/decorators/current-member.decorator.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/common/guards/organisation.guard.spec.ts`:

```typescript
import { OrganisationGuard } from './organisation.guard';
import { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  organisationMember: {
    findFirst: jest.fn(),
  },
};

const makeContext = (user: object) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
}) as unknown as ExecutionContext;

describe('OrganisationGuard', () => {
  let guard: OrganisationGuard;

  beforeEach(() => {
    guard = new OrganisationGuard(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
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

  it('attaches organisation and member to request when valid', async () => {
    const member = { id: 'm1', organisation: { id: 'org1', status: 'active' } };
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api
pnpm test -- --testPathPattern=organisation.guard.spec --no-coverage
```

Expected: FAIL — `OrganisationGuard` not found.

- [ ] **Step 3: Implement OrganisationGuard**

Create `apps/api/src/common/guards/organisation.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganisationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string; organisationId?: string };

    if (!user?.sub || !user?.organisationId) return false;

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
```

- [ ] **Step 4: Create CurrentMember decorator**

Create `apps/api/src/common/decorators/current-member.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.member;
  },
);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=organisation.guard.spec --no-coverage
```

Expected: PASS — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/guards/organisation.guard.ts \
        apps/api/src/common/guards/organisation.guard.spec.ts \
        apps/api/src/common/decorators/current-member.decorator.ts
git commit -m "feat(auth): add OrganisationGuard with member attachment"
```

---

## Task 5: DTOs

**Files:**
- Create: `apps/api/src/modules/auth/dto/register.dto.ts`
- Create: `apps/api/src/modules/auth/dto/login.dto.ts`
- Create: `apps/api/src/modules/auth/dto/refresh.dto.ts`
- Create: `apps/api/src/modules/auth/dto/invite.dto.ts`
- Create: `apps/api/src/modules/auth/dto/accept-invite.dto.ts`

- [ ] **Step 1: Create register.dto.ts**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Alpha Storage GmbH' })
  @IsString()
  organisationName: string;

  @ApiProperty({ example: 'Max Müller' })
  @IsString()
  ownerName: string;

  @ApiProperty({ example: 'max@alpha-storage.de' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'DE' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'de' })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty() organisationId: string;
  @ApiProperty() userId: string;
  @ApiProperty() role: string;
}
```

- [ ] **Step 2: Create login.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'max@alpha-storage.de' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
```

- [ ] **Step 3: Create refresh.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
```

- [ ] **Step 4: Create invite.dto.ts**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum InviteRole {
  operator = 'operator',
  tenant = 'tenant',
}

export class InviteDto {
  @ApiProperty({ example: 'operator@site.de' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: InviteRole })
  @IsEnum(InviteRole)
  role: InviteRole;
}
```

- [ ] **Step 5: Create accept-invite.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'Maria Müller' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/dto/
git commit -m "feat(auth): add register, login, refresh, invite, accept-invite DTOs"
```

---

## Task 6: Auth Service — Register & Login

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Replace the contents of `apps/api/src/modules/auth/auth.service.spec.ts`:

```typescript
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn() },
  organisation: { create: jest.fn() },
  organisationMember: { create: jest.fn(), findFirst: jest.fn() },
  userSession: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  invitation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

const mockJwt = { sign: jest.fn().mockReturnValue('access.token.here') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwt as unknown as JwtService,
    );
    jest.clearAllMocks();
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
          user: { create: jest.fn().mockResolvedValue(user) },
          organisation: { create: jest.fn().mockResolvedValue(org) },
          organisationMember: { create: jest.fn().mockResolvedValue(member) },
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
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: await bcrypt.hash('correct', 12),
      });
      await expect(
        service.login({ email: 'u@test.de', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('correct', 12);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: hash, type: 'owner' });
      mockPrisma.organisationMember.findFirst.mockResolvedValue({
        id: 'm1', organisationId: 'org1', role: 'owner', userId: 'u1',
      });
      mockPrisma.userSession.create.mockResolvedValue({});

      const result = await service.login({ email: 'u@test.de', password: 'correct' });

      expect(result.accessToken).toBe('access.token.here');
      expect(result.role).toBe('owner');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
pnpm test -- --testPathPattern=auth.service.spec --no-coverage
```

Expected: FAIL — methods not implemented.

- [ ] **Step 3: Implement AuthService**

Replace `apps/api/src/modules/auth/auth.service.ts`:

```typescript
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, AuthResponseDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL = '15m';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('EMAIL_ALREADY_EXISTS');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const slug = slugify(dto.organisationName, { lower: true, strict: true });

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.ownerName,
          passwordHash,
          type: 'owner',
        },
      });

      const organisation = await tx.organisation.create({
        data: {
          legalName: dto.organisationName,
          slug,
          countryCode: dto.countryCode ?? 'DE',
          defaultLanguage: dto.defaultLanguage ?? 'de',
          currency: 'EUR',
          billingEmail: dto.email,
          status: 'active',
          plan: 'starter',
        },
      });

      const member = await tx.organisationMember.create({
        data: { organisationId: organisation.id, userId: user.id, role: 'owner' },
      });

      return { user, organisation, member };
    });

    return this.issueTokens(result.user, result.member);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const member = await this.prisma.organisationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!member) throw new UnauthorizedException('NO_ORGANISATION');

    return this.issueTokens(user, member);
  }

  async refresh(dto: RefreshDto): Promise<Pick<AuthResponseDto, 'accessToken' | 'refreshToken'>> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const session = await this.prisma.userSession.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: { include: { memberships: { orderBy: { createdAt: 'desc' }, take: 1 } } } },
    });
    if (!session) throw new UnauthorizedException('INVALID_REFRESH_TOKEN');

    const member = session.user.memberships[0];
    if (!member) throw new UnauthorizedException('NO_ORGANISATION');

    return this.issueTokens(session.user, member);
  }

  async invite(
    organisationId: string,
    invitedByUserId: string,
    dto: InviteDto,
  ): Promise<{ invitationId: string }> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const invitation = await this.prisma.invitation.create({
      data: {
        organisationId,
        email: dto.email,
        role: dto.role,
        tokenHash,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedByUserId,
      },
    });

    // TODO(plan-2): queue invitation email via Notifications module
    return { invitationId: invitation.id };
  }

  async validateInviteToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitation = await this.prisma.invitation.findFirst({
      where: { tokenHash },
      include: { organisation: true },
    });
    if (!invitation) return { valid: false };
    const expired = invitation.expiresAt < new Date();
    const accepted = invitation.acceptedAt !== null;
    return {
      valid: !expired && !accepted && invitation.status === 'pending',
      email: invitation.email,
      organisationName: invitation.organisation.legalName,
      role: invitation.role,
    };
  }

  async acceptInvite(dto: AcceptInviteDto): Promise<AuthResponseDto> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const invitation = await this.prisma.invitation.findFirst({
      where: { tokenHash, status: 'pending' },
    });
    if (!invitation) throw new NotFoundException('INVITATION_NOT_FOUND');
    if (invitation.expiresAt < new Date()) throw new UnauthorizedException('INVITATION_EXPIRED');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          name: dto.name,
          passwordHash,
          type: invitation.role as 'operator' | 'tenant',
        },
      });

      const member = await tx.organisationMember.create({
        data: { organisationId: invitation.organisationId, userId: user.id, role: invitation.role },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), status: 'accepted' },
      });

      return { user, member };
    });

    return this.issueTokens(result.user, result.member);
  }

  private async issueTokens(user: { id: string; type: string }, member: { organisationId: string; role: string; userId: string }): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      organisationId: member.organisationId,
      role: member.role,
      type: user.type,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });

    const rawRefresh = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      organisationId: member.organisationId,
      userId: user.id,
      role: member.role,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=auth.service.spec --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.ts \
        apps/api/src/modules/auth/auth.service.spec.ts
git commit -m "feat(auth): email/password register and login with JWT + refresh tokens"
```

---

## Task 7: Auth Controller

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Replace the controller**

```typescript
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, AuthResponseDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Business owner self-registration' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Email/password login for all user types' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Validate invitation token' })
  validateInvite(@Param('token') token: string) {
    return this.auth.validateInviteToken(token);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept invitation and set password' })
  acceptInvite(@Body() dto: AcceptInviteDto): Promise<AuthResponseDto> {
    return this.auth.acceptInvite(dto);
  }
}

@ApiTags('workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class OrganisationInviteController {
  constructor(private readonly auth: AuthService) {}

  @Post('invitations')
  @ApiOperation({ summary: 'Invite an operator or tenant' })
  invite(
    @Param('organisationId') organisationId: string,
    @CurrentMember() member: { userId: string },
    @Body() dto: InviteDto,
  ) {
    return this.auth.invite(organisationId, member.userId, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/auth/auth.controller.ts
git commit -m "feat(auth): add register, login, refresh, invite, accept-invite endpoints"
```

---

## Task 8: Auth Module Wiring

**Files:**
- Modify: `apps/api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Update the module**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController, OrganisationInviteController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, OrganisationGuard],
  controllers: [AuthController, OrganisationInviteController],
  exports: [AuthService, OrganisationGuard],
})
export class AuthModule {}
```

- [ ] **Step 2: Add JWT_SECRET to .env.example**

Open `.env.example` and:

1. Remove all `KEYCLOAK_*` lines.
2. Add:

```
JWT_SECRET=change-me-in-production-min-32-chars
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
cd apps/api
pnpm build
```

Expected: Build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/auth.module.ts .env.example
git commit -m "feat(auth): wire AuthModule with JwtModule, remove Keycloak"
```

---

## Task 9: Remove Keycloak from Docker

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.full.yml`

- [ ] **Step 1: Remove Keycloak from docker-compose.yml**

In `docker-compose.yml`, delete the entire `keycloak:` service block (image, ports, environment, healthcheck, depends_on sections). Also remove any `keycloak` references from `depends_on` in the `api` service.

- [ ] **Step 2: Remove Keycloak from docker-compose.full.yml**

In `docker-compose.full.yml`, delete the `keycloak:` service block and remove it from `api` depends_on.

- [ ] **Step 3: Verify Docker Compose validates**

```bash
docker compose config --quiet
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.full.yml
git commit -m "chore(docker): remove Keycloak — replaced by email/password JWT"
```

---

## Task 10: Create apps/web — Unified Portal Shell

**Files:** All new under `apps/web/`

- [ ] **Step 1: Create package.json**

Create `apps/web/package.json`:

```json
{
  "name": "@sitelager/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "@sitelager/ui": "workspace:*",
    "@sitelager/i18n": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.19",
    "postcss": "^8",
    "tailwindcss": "^3.4.3",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  transpilePackages: ['@sitelager/ui', '@sitelager/i18n'],
};
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B1F3A',
        primary: '#2563EB',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 6: Create src/app/globals.css**

Create `apps/web/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Create src/app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SiteLager',
  description: 'The operating system for modern storage sites.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Install dependencies**

```bash
cd apps/web
pnpm install
```

Expected: node_modules created; no errors.

- [ ] **Step 9: Add apps/web to pnpm-workspace.yaml**

Open `pnpm-workspace.yaml` and ensure `apps/web` is covered by the `apps/*` glob (it should be already). Verify:

```bash
cat pnpm-workspace.yaml
```

Expected: `- 'apps/*'` is present.

- [ ] **Step 10: Commit**

```bash
git add apps/web/
git commit -m "feat(web): scaffold unified Next.js portal shell"
```

---

## Task 11: Auth Library and Middleware

**Files:**
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/middleware.ts`

- [ ] **Step 1: Create src/lib/auth.ts**

This is the client-side auth helper (reads/writes the JWT cookie):

```typescript
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ACCESS_COOKIE = 'sl_access';
const REFRESH_COOKIE = 'sl_refresh';

export interface TokenPayload {
  sub: string;
  organisationId: string;
  role: 'owner' | 'operator' | 'tenant';
  type: string;
  exp: number;
}

export function decodeJwt(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value;
}

export async function setTokens(accessToken: string, refreshToken: string) {
  const cookieStore = cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  cookieStore.set(REFRESH_COOKIE, refreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });
}

export async function clearTokens() {
  const cookieStore = cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export function getCurrentUser(): TokenPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

export async function requireAuth() {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
```

- [ ] **Step 2: Create src/lib/api.ts**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    register: (body: object) =>
      apiFetch('/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: object) =>
      apiFetch('/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    refresh: (refreshToken: string) =>
      apiFetch('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    validateInvite: (token: string) =>
      apiFetch(`/v1/auth/invite/${token}`),
    acceptInvite: (body: object) =>
      apiFetch('/v1/auth/accept-invite', { method: 'POST', body: JSON.stringify(body) }),
  },
};
```

- [ ] **Step 3: Create src/middleware.ts**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/accept-invite'];

function decodeJwtExpiry(token: string): number {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp ?? 0;
  } catch {
    return 0;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const accessToken = request.cookies.get('sl_access')?.value;
  const isValid = accessToken && decodeJwtExpiry(accessToken) * 1000 > Date.now();

  if (!isValid && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isValid && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/middleware.ts
git commit -m "feat(web): auth helpers, API client, and route protection middleware"
```

---

## Task 12: Login Page

**Files:**
- Create: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Create the login page**

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Login failed');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to SiteLager</h1>
        <p className="text-slate-500 mb-6 text-sm">
          No account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register your storage business
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the login API route (sets cookie)**

Create `apps/web/src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('sl_access', data.accessToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  response.cookies.set('sl_refresh', data.refreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  return response;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/login/ apps/web/src/app/api/
git commit -m "feat(web): login page with cookie-based JWT session"
```

---

## Task 13: Register Page

**Files:**
- Create: `apps/web/src/app/register/page.tsx`
- Create: `apps/web/src/app/api/auth/register/route.ts`

- [ ] **Step 1: Create the register page**

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationName: form.get('organisationName'),
          ownerName: form.get('ownerName'),
          email: form.get('email'),
          password: form.get('password'),
          countryCode: 'DE',
          defaultLanguage: 'de',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Registration failed');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">List your storage business</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Already registered?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business name</label>
            <input
              name="organisationName"
              type="text"
              required
              placeholder="Alpha Storage GmbH"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
            <input
              name="ownerName"
              type="text"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password <span className="text-slate-400">(min 8 characters)</span>
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account — it\'s free'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the register API route**

Create `apps/web/src/app/api/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('sl_access', data.accessToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  response.cookies.set('sl_refresh', data.refreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  return response;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/register/
git commit -m "feat(web): owner registration page"
```

---

## Task 14: Accept-Invite Page

**Files:**
- Create: `apps/web/src/app/accept-invite/page.tsx`
- Create: `apps/web/src/app/api/auth/accept-invite/route.ts`

- [ ] **Step 1: Create accept-invite page**

```tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [invite, setInvite] = useState<{ email: string; organisationName: string; role: string; valid: boolean } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/validate-invite?token=${token}`)
      .then((r) => r.json())
      .then(setInvite)
      .catch(() => setError('Failed to validate invitation'));
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: form.get('name'), password: form.get('password') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to accept invitation');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (!token) return <p className="text-center mt-20 text-slate-500">No invitation token found.</p>;
  if (!invite) return <p className="text-center mt-20 text-slate-400">Validating invitation…</p>;
  if (!invite.valid) return <p className="text-center mt-20 text-red-600">This invitation has expired or is invalid.</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">You've been invited</h1>
        <p className="text-slate-500 text-sm mb-6">
          Join <strong>{invite.organisationName}</strong> as <strong>{invite.role}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
            <input name="name" type="text" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input value={invite.email} disabled className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Set password</label>
            <input name="password" type="password" required minLength={8} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Joining…' : 'Accept invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: Create API routes for validate-invite and accept-invite**

Create `apps/web/src/app/api/auth/validate-invite/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const res = await fetch(`${API_URL}/v1/auth/invite/${token}`);
  return NextResponse.json(await res.json(), { status: res.status });
}
```

Create `apps/web/src/app/api/auth/accept-invite/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/auth/accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('sl_access', data.accessToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  response.cookies.set('sl_refresh', data.refreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  return response;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/accept-invite/ apps/web/src/app/api/auth/
git commit -m "feat(web): accept-invite page with token validation"
```

---

## Task 15: Dashboard & My-Storage Stub Pages

**Files:**
- Create: `apps/web/src/app/dashboard/page.tsx`
- Create: `apps/web/src/app/my-storage/page.tsx`
- Create: `apps/web/src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Create dashboard stub (owner/operator)**

```tsx
import { requireAuth } from '@/lib/auth';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <form action="/api/auth/logout" method="POST">
            <button className="text-sm text-slate-500 hover:text-slate-700">Sign out</button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <p className="text-slate-600 text-sm">
            Signed in as <strong>{user.role}</strong> · Organisation{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">{user.organisationId}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Sites', href: '/sites', placeholder: true },
            { label: 'Units', href: '/units', placeholder: true },
            { label: 'Team', href: '/team', placeholder: true },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{card.label}</p>
              <p className="text-slate-500 text-sm">Coming in Plan 2</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create my-storage stub (tenant)**

```tsx
import { requireAuth } from '@/lib/auth';

export default async function MyStoragePage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Storage</h1>
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-slate-500 text-sm">
            Tenant portal — active rentals, invoices, and access credentials will appear here
            (Plan 4).
          </p>
          <p className="mt-3 text-slate-400 text-xs">User ID: {user.sub}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create logout route**

Create `apps/web/src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect(new URL('/login', 'http://localhost:3001'));
  response.cookies.delete('sl_access');
  response.cookies.delete('sl_refresh');
  return response;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/ \
        apps/web/src/app/my-storage/ \
        apps/web/src/app/api/auth/logout/
git commit -m "feat(web): dashboard and my-storage stub pages with logout"
```

---

## Task 16: Environment Config and Smoke Test

**Files:**
- Modify: `.env.example`
- New: `.env` (local, not committed)

- [ ] **Step 1: Final .env.example state**

Ensure `.env.example` contains these keys (and no KEYCLOAK_* keys):

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sitelager

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=sitelager

# Auth
JWT_SECRET=change-me-in-production-use-min-32-random-chars

# App
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000

# SMTP (MailHog locally)
SMTP_HOST=localhost
SMTP_PORT=1025
```

- [ ] **Step 2: Start infrastructure**

```bash
docker compose up -d postgres redis minio mailhog
```

Expected: 4 containers running.

- [ ] **Step 3: Run migration**

```bash
cd apps/api
cp ../../.env.example ../../.env   # fill in JWT_SECRET
npx prisma migrate deploy
```

Expected: Migration applied successfully.

- [ ] **Step 4: Start the API**

```bash
pnpm dev
```

Expected: NestJS starts on port 3000 with no errors. Swagger available at `http://localhost:3000/docs`.

- [ ] **Step 5: Smoke test — register**

```bash
curl -s -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"organisationName":"Test GmbH","ownerName":"Max","email":"max@test.de","password":"test1234"}' \
  | jq '.accessToken, .organisationId, .role'
```

Expected output (values will differ):

```
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
"clw..."
"owner"
```

- [ ] **Step 6: Smoke test — login**

```bash
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"max@test.de","password":"test1234"}' \
  | jq '.role, .organisationId'
```

Expected: `"owner"` and a valid organisation ID.

- [ ] **Step 7: Start the unified portal**

```bash
cd apps/web
pnpm dev
```

Expected: Next.js starts on port 3001.

- [ ] **Step 8: Verify register flow in browser**

1. Open `http://localhost:3001/register`
2. Fill in the form and submit
3. Should redirect to `/dashboard` showing your role and organisation ID

- [ ] **Step 9: Verify middleware protection**

1. Open a new incognito window
2. Navigate to `http://localhost:3001/dashboard`
3. Should redirect to `/login`

- [ ] **Step 10: Run full test suite**

```bash
cd apps/api
pnpm test --no-coverage
```

Expected: All tests pass including `organisation.guard.spec` and `auth.service.spec`.

- [ ] **Step 11: Final commit**

```bash
git add .env.example
git commit -m "chore: finalize env config for Plan 1 — auth portal foundation complete"
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] `POST /v1/auth/register` — creates User + Organisation + OrganisationMember in one transaction
- [ ] `POST /v1/auth/login` — constant-time bcrypt compare, returns JWT + refresh token
- [ ] `POST /v1/auth/refresh` — validates opaque token hash, rotates token
- [ ] `GET /v1/auth/invite/:token` — validates token, returns email + org name + role
- [ ] `POST /v1/auth/accept-invite` — creates User + OrganisationMember, marks invitation accepted
- [ ] `POST /v1/organisations/:id/invitations` — owner can invite operators; owner or operator can invite tenants; enforced server-side
- [ ] `OrganisationGuard` — blocks requests with invalid/missing organisationId in JWT
- [ ] Middleware on `apps/web` — unauthenticated users redirected to `/login`
- [ ] Keycloak removed from both docker-compose files and .env.example
- [ ] `JWT_SECRET` is required in config; app refuses to start without it
