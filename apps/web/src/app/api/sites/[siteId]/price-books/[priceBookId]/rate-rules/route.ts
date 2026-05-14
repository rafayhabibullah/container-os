import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest, { params }: { params: { siteId: string; priceBookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/rate-rules`,
    'POST', auth.token, body,
  );
}

export async function DELETE(request: NextRequest, { params }: { params: { siteId: string; priceBookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const rateRuleId = segments[segments.length - 1];
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/rate-rules/${rateRuleId}`,
    'DELETE', auth.token,
  );
}
