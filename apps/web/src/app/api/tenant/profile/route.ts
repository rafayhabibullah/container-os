import { NextRequest, NextResponse } from 'next/server';
import { getTenantAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET() {
  const auth = getTenantAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend('/v1/tenant/profile', 'GET', auth.token);
}

export async function PATCH(req: NextRequest) {
  const auth = getTenantAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  return proxyToBackend('/v1/tenant/profile', 'PATCH', auth.token, body);
}
