import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.plan) return NextResponse.json({ message: 'plan is required' }, { status: 400 });
  return proxyToBackend(`/v1/organisations/${ctx.payload.organisationId}/subscription/checkout`, 'POST', ctx.token, body);
}
