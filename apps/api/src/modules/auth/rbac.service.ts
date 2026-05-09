import { Injectable } from '@nestjs/common';

interface PermissionHolder {
  permissions: string[];
}

@Injectable()
export class RbacService {
  hasPermission(user: PermissionHolder, required: string): boolean {
    return user.permissions.some((p) => {
      if (p === required) return true;
      const [ns] = required.split(':');
      if (p === `${ns}:*`) return true;
      return false;
    });
  }

  hasSiteAccess(userSiteIds: string[], resourceSiteId: string): boolean {
    return userSiteIds.includes(resourceSiteId);
  }
}
