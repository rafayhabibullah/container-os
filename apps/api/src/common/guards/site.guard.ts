import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { DomainException, ErrorCodes } from '@container-os/domain-types';
import { RbacService } from '../../modules/auth/rbac.service';

@Injectable()
export class SiteGuard implements CanActivate {
  constructor(private rbac: RbacService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const siteId = request.params.siteId ?? request.body?.siteId;

    if (!siteId) return true;
    if (user?.type === 'owner') return true;

    if (!user || !this.rbac.hasSiteAccess(user.siteIds, siteId)) {
      throw new DomainException(
        ErrorCodes.SITE_SCOPE_VIOLATION,
        `User does not have access to site ${siteId}`,
      );
    }
    return true;
  }
}
