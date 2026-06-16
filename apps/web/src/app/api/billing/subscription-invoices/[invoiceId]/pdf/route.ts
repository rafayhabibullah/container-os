import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api-route-helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export async function GET(_request: NextRequest, { params }: { params: { invoiceId: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_URL}/v1/organisations/${ctx.payload.organisationId}/subscription/invoices/${params.invoiceId}/pdf`, {
    headers: { Authorization: `Bearer ${ctx.token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Failed to download invoice' }));
    return NextResponse.json(data, { status: res.status });
  }
  const bytes = await res.arrayBuffer();
  const headers = new Headers();
  headers.set('Content-Type', res.headers.get('content-type') ?? 'application/pdf');
  headers.set('Content-Disposition', res.headers.get('content-disposition') ?? `attachment; filename="${params.invoiceId}.pdf"`);
  return new Response(bytes, { status: 200, headers });
}
