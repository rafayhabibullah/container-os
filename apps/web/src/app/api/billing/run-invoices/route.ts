import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const orgId = body.organisationId ?? ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/invoices/run`, 'POST', ctx.token);
}
