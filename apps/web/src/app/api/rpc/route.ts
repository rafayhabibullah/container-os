import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getTenantAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const { path, method, body } = await req.json();
  if (!path || typeof path !== 'string' || !path.startsWith('/v1/')) {
    return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  }
  const isTenantPath = path.startsWith('/v1/tenant/');
  const ctx = isTenantPath ? getTenantAuthContext() : getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(path, method ?? 'GET', ctx.token, body ? JSON.parse(body) : undefined);
}
