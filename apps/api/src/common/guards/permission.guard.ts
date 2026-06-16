import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RbacService } from '../../modules/auth/rbac.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rbac: RbacService) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest();
    const member = request.member as { role?: string; siteIds?: string[] } | undefined;
    const user = request.user as { permissions?: string[] } | undefined;
    const permissions = this.rbac.permissionsFor(member?.role, user?.permissions);
    const allowed = required.every((permission) => this.rbac.hasPermission({ permissions }, permission));
    if (!allowed) throw new ForbiddenException('Missing required permission');

    const requestedSiteId = request.params?.siteId ?? request.body?.siteId ?? request.query?.siteId;
    const scopedSiteIds = member?.siteIds ?? [];
    const globalRoles = new Set(['owner', 'billing_admin']);
    if (requestedSiteId && scopedSiteIds.length > 0 && !globalRoles.has(member?.role ?? '') && !scopedSiteIds.includes(requestedSiteId)) {
      throw new ForbiddenException('Site scope violation');
    }
    return true;
  }
}
