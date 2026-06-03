import { NextResponse } from 'next/server';
import { getTenantAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET() {
  const auth = getTenantAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend('/v1/tenant/agreements', 'GET', auth.token);
}
