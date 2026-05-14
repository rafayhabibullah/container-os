import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest, { params }: { params: { siteId: string; priceBookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const action = url.pathname.endsWith('/publish') ? 'publish' : 'archive';
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/${action}`,
    'POST', auth.token,
  );
}
