import { NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST() {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(`/v1/organisations/${ctx.payload.organisationId}/subscription/reconcile-checkout`, 'POST', ctx.token);
}
