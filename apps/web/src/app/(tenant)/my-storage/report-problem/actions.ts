'use server';

import { serverTenantFetch } from '@/lib/server-api';

export async function submitIncidentReport(params: {
  agreementId: string;
  type: string;
  description: string;
}) {
  return serverTenantFetch('/v1/tenant/incidents', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
