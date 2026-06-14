import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });

  // Form submits as application/x-www-form-urlencoded; fall back to JWT org ID
  const orgId = ctx.payload.organisationId;
  const res = await proxyToBackend(`/v1/organisations/${orgId}/invoices/run`, 'POST', ctx.token);

  if (res.status >= 400) {
    return NextResponse.redirect(new URL('/invoices?runError=1', req.url));
  }

  const data = await res.json().catch(() => ({ created: 0, skipped: 0, errors: 0 }));
  const params = new URLSearchParams({
    runCreated: String(data.created ?? 0),
    runSkipped: String(data.skipped ?? 0),
    runErrors: String(data.errors ?? 0),
  });
  return NextResponse.redirect(new URL(`/invoices?${params.toString()}`, req.url));
}
