import { NextRequest, NextResponse } from 'next/server';
import { getTenantAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  const auth = getTenantAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend('/v1/tenant/incidents', 'POST', auth.token, body);
}
