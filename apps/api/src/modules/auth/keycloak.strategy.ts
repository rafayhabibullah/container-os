import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

interface KeycloakJwtPayload {
  sub: string;
  email: string;
  workspace_id?: string;
  realm_access?: { roles: string[] };
}

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaClient,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('KEYCLOAK_CLIENT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: KeycloakJwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId: payload.sub },
      include: { assignments: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException('User not found in local database');

    const permissions = user.assignments.flatMap((a) => a.role.permissions);
    const siteIds = user.assignments.flatMap((a) => a.siteIds);
    const workspaceId = payload.workspace_id ?? 'default';

    return {
      id: user.id,
      type: user.type,
      email: user.email,
      workspaceId,
      siteIds,
      permissions,
    };
  }
}
