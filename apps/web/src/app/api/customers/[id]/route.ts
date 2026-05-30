import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/customers/${params.id}`,
    'GET',
    ctx.token,
  );
}
