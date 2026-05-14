import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/agreements/${params.id}`,
    'GET',
    ctx.token,
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = req.headers.get('x-action') ?? 'send';
  const subPath = action === 'terminate' ? 'terminate' : 'send';
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/agreements/${params.id}/${subPath}`,
    'POST',
    ctx.token,
    body,
  );
}
