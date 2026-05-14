import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return new Response(JSON.stringify({ message: 'siteId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/sites/${siteId}/delinquency-policy`, 'GET', ctx.token);
}

export async function PUT(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { siteId, ...rest } = body;
  if (!siteId) return new Response(JSON.stringify({ message: 'siteId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/sites/${siteId}/delinquency-policy`, 'PUT', ctx.token, rest);
}
