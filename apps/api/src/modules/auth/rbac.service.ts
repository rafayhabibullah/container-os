import { Injectable } from '@nestjs/common';

interface PermissionHolder {
  permissions: string[];
}

@Injectable()
export class RbacService {
  private readonly rolePermissions: Record<string, string[]> = {
    owner: ['organisation:*', 'sites:*', 'units:*', 'reservations:*', 'agreements:*', 'billing:*', 'payments:*', 'operations:*', 'documents:*', 'reports:*', 'team:*', 'settings:*'],
    billing_admin: ['billing:*', 'payments:*', 'documents:read', 'reports:financial'],
    site_manager: ['sites:read', 'units:*', 'reservations:*', 'agreements:*', 'operations:*', 'documents:*', 'reports:site'],
    operator: ['sites:read', 'units:read', 'reservations:read', 'agreements:read', 'operations:*', 'documents:read', 'reports:site'],
    tenant: ['tenant:*'],
  };

  permissionsFor(role?: string, explicit: string[] = []): string[] {
    return [...new Set([...(role ? this.rolePermissions[role] ?? [] : []), ...explicit])];
  }

  hasPermission(user: PermissionHolder, required: string): boolean {
    return user.permissions.some((p) => {
      if (p === required) return true;
      // Wildcard only applies when required has a namespace (contains ':')
      if (!required.includes(':')) return false;
      const [ns] = required.split(':');
      if (p === `${ns}:*`) return true;
      return false;
    });
  }

  hasSiteAccess(userSiteIds: string[], resourceSiteId: string): boolean {
    return userSiteIds.includes(resourceSiteId);
  }
}
