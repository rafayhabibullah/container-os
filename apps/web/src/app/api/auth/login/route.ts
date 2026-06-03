import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const [, payloadB64] = (data.accessToken as string).split('.');
  const { type: userType } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as { type: string };

  const response = NextResponse.json({ ok: true, userType });
  if (userType === 'tenant') {
    response.cookies.set('sl_tenant_access', data.accessToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
    response.cookies.set('sl_tenant_refresh', data.refreshToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
  } else {
    response.cookies.set('sl_access', data.accessToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
    response.cookies.set('sl_refresh', data.refreshToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
  }
  return response;
}
