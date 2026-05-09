import { describe, it, expect } from 'vitest';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
  const rbac = new RbacService();

  it('returns true when user has required permission', () => {
    const result = rbac.hasPermission(
      { permissions: ['invoices:read', 'units:write'] },
      'invoices:read',
    );
    expect(result).toBe(true);
  });

  it('returns false when user lacks required permission', () => {
    const result = rbac.hasPermission(
      { permissions: ['units:write'] },
      'finance:export',
    );
    expect(result).toBe(false);
  });

  it('returns true when user has wildcard permission for namespace', () => {
    const result = rbac.hasPermission(
      { permissions: ['invoices:*'] },
      'invoices:write',
    );
    expect(result).toBe(true);
  });
});
