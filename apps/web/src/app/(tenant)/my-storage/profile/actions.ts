'use server';

import { serverTenantFetch } from '@/lib/server-api';

export async function updateProfile(data: { name: string | null; phone: string | null }) {
  return serverTenantFetch('/v1/tenant/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
