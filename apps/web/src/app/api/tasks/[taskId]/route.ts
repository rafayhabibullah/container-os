import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest, { params }: { params: { taskId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/tasks/${params.taskId}`, 'PATCH', auth.token, body);
}
