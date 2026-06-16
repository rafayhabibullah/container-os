import { NextResponse } from 'next/server';
import { getTenantAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(_request: Request, { params }: { params: { invoiceId: string } }) {
  const auth = getTenantAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(`/v1/tenant/invoices/${params.invoiceId}/pay`, 'POST', auth.token);
}
