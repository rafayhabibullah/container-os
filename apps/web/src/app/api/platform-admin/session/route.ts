import { NextRequest, NextResponse } from 'next/server';
import { isValidPlatformToken, PLATFORM_ADMIN_COOKIE } from '@/lib/platform-session';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const action = String(formData.get('action') ?? '');
  const response = NextResponse.redirect(new URL('/platform-admin', request.url), { status: 303 });

  if (action === 'logout') {
    response.cookies.delete(PLATFORM_ADMIN_COOKIE);
    return response;
  }

  const token = String(formData.get('token') ?? '');
  if (!isValidPlatformToken(token)) {
    return NextResponse.redirect(new URL('/platform-admin?error=invalid', request.url), { status: 303 });
  }

  response.cookies.set(PLATFORM_ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}
