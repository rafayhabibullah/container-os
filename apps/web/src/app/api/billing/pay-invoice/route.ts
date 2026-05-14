import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api-route-helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { organisationId, invoiceId } = body;

  const res = await fetch(
    `${API_URL}/v1/organisations/${organisationId}/invoices/${invoiceId}/pay`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` },
    },
  );
  const data = await res.json().catch(() => ({}));

  if (res.ok && data.checkoutUrl) {
    // Redirect to Mollie checkout in new tab — return URL for client redirect
    return NextResponse.json({ checkoutUrl: data.checkoutUrl }, { status: 200 });
  }
  return NextResponse.json(data, { status: res.status });
}
