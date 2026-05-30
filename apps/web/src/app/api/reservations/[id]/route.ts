import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/reservations/${params.id}`,
    'GET',
    ctx.token,
  );
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/reservations/${params.id}`,
    'PATCH',
    ctx.token,
    body,
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const action = req.headers.get('x-action') ?? 'agreement';
  if (action === 'agreement') {
    return proxyToBackend(
      `/v1/organisations/${ctx.payload.organisationId}/reservations/${params.id}/agreement`,
      'POST',
      ctx.token,
      body,
    );
  }
  return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
}
