import { NextRequest, NextResponse } from 'next/server';
import { backendApi } from '@/lib/backend-url';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(backendApi('/public/v1/checkout-sessions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
