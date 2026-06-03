'use server';

import { serverTenantFetch } from '@/lib/server-api';

export async function submitMoveOutRequest(params: {
  agreementId: string;
  requestedDate: string;
}) {
  return serverTenantFetch('/v1/tenant/move-out-requests', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
