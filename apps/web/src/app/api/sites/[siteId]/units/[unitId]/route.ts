import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest, { params }: { params: { siteId: string; unitId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/units/${params.unitId}`,
    'PATCH',
    auth.token,
    body,
  );
}

export async function DELETE(_request: NextRequest, { params }: { params: { siteId: string; unitId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/units/${params.unitId}`,
    'DELETE',
    auth.token,
  );
}
