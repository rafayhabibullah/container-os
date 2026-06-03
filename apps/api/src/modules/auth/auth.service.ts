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
import { PrismaClient } from '@prisma/client';
import { RegisterDto, TenantRegisterDto, AuthResponseDto } from './dto/register.dto';
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
    private readonly prisma: PrismaClient,
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
        },
      });

      const member = await tx.organisationMember.create({
        data: {
          organisationId: organisation.id,
          userId: user.id,
          role: 'owner',
        },
      });

      return { user, organisation, member };
    });

    return this.issueTokens(result.user, result.member);
  }

  async registerTenant(dto: TenantRegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('EMAIL_ALREADY_EXISTS');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash, type: 'tenant' },
    });

    return this.issueTokens(user, null);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) {
      await this.recordSecurityEvent('login_failed', null, { email: dto.email, reason: 'user_not_found' });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordSecurityEvent('login_failed', user.id, { reason: 'wrong_password' });
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const member = await this.prisma.organisationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!member && user.type !== 'tenant') throw new UnauthorizedException('NO_ORGANISATION');

    return this.issueTokens(user, member ?? null);
  }

  async refresh(dto: RefreshDto): Promise<Pick<AuthResponseDto, 'accessToken' | 'refreshToken'>> {
    const tokenHash = createHash('sha256').update(dto.refreshToken).digest('hex');
    const session = await this.prisma.userSession.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: {
        user: {
          include: { memberships: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    });
    if (!session) throw new UnauthorizedException('INVALID_REFRESH_TOKEN');

    const userWithMemberships = session.user as typeof session.user & {
      memberships: Array<{ organisationId: string; role: string; userId: string }>;
    };
    const memberships = userWithMemberships.memberships;
    if (!memberships?.length && session.user.type !== 'tenant') throw new UnauthorizedException('NO_ORGANISATION');

    return this.issueTokens(session.user, memberships?.[0] ?? null);
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
        data: {
          organisationId: invitation.organisationId,
          userId: user.id,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date(), status: 'accepted' },
      });

      return { user, member };
    });

    return this.issueTokens(result.user, result.member);
  }

  private async recordSecurityEvent(eventType: string, _actorId: string | null, details: object) {
    try {
      await this.prisma.securityEvent.create({ data: { type: eventType, severity: 'medium', details } });
    } catch {
      // non-critical
    }
  }

  private async issueTokens(
    user: { id: string; type: string },
    member: { organisationId: string; role: string; userId: string } | null,
  ): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id,
      organisationId: member?.organisationId ?? null,
      role: member?.role ?? user.type,
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
      organisationId: member?.organisationId ?? null,
      userId: user.id,
      role: member?.role ?? user.type,
    };
  }
}
