'use server';

import { serverTenantFetch } from '@/lib/server-api';

export async function updatePreference(data: { eventType: string; channel: string; enabled: boolean }) {
  return serverTenantFetch('/v1/tenant/notification-preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
