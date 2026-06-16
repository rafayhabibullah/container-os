import { NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST() {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/payment-account/mollie/onboarding`, 'POST', auth.token, {
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/settings/payments`,
  });
}
