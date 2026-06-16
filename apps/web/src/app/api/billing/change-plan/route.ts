import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });

  const { plan } = await req.json().catch(() => ({ plan: undefined }));
  if (!plan) return NextResponse.json({ message: 'plan is required' }, { status: 400 });

  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/subscription/change-plan`, 'POST', ctx.token, { plan });
}
