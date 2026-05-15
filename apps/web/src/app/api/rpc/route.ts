import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const { path, method, body } = await req.json();
  if (!path || typeof path !== 'string' || !path.startsWith('/v1/')) {
    return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  }
  return proxyToBackend(path, method ?? 'GET', ctx.token, body ? JSON.parse(body) : undefined);
}
