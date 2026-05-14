import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/agreements${qs ? `?${qs}` : ''}`,
    'GET',
    ctx.token,
  );
}
