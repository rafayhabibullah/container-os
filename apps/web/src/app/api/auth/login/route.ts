import { NextRequest, NextResponse } from 'next/server';
import { backendApi } from '@/lib/backend-url';

export async function POST(request: NextRequest) {
  const body = await request.json();
  let res: Response;
  try {
    res = await fetch(backendApi('/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'API server is not reachable. Please start the backend and try again.' } },
      { status: 503 },
    );
  }

  const data = await res.json().catch(() => ({
    error: { code: 'INVALID_BACKEND_RESPONSE', message: 'API server returned an invalid response.' },
  }));
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
