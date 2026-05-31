import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET() {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites`,
    'GET', auth.token,
  );
}

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites`,
    'POST', auth.token, body,
  );
}
