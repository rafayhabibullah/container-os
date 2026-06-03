import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(_request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/operator/v1/units?siteId=${params.siteId}`,
    'GET',
    auth.token,
  );
}

export async function POST(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/units`,
    'POST',
    auth.token,
    body,
  );
}
