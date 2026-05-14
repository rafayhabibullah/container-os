import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const customerId = req.nextUrl.searchParams.get('customerId');
  if (!customerId) return new Response(JSON.stringify({ message: 'customerId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/customers/${customerId}/mandates`, 'GET', ctx.token);
}

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { customerId, ...rest } = body;
  if (!customerId) return new Response(JSON.stringify({ message: 'customerId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/customers/${customerId}/mandates`, 'POST', ctx.token, rest);
}
