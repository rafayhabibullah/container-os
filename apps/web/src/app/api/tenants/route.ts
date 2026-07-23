import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET() {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(`/v1/organisations/${ctx.payload.organisationId}/tenants`, 'GET', ctx.token);
}

export async function POST(request: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${ctx.payload.organisationId}/tenants/import-existing`, 'POST', ctx.token, body);
}
