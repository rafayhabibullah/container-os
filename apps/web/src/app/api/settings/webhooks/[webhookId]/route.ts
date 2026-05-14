import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function DELETE(_request: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/webhooks/${params.webhookId}`, 'DELETE', auth.token);
}
