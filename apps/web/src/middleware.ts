import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/accept-invite', '/api/auth', '/api/checkout', '/storage'];

// Edge Runtime cannot import from src/lib/auth — JWT decode is intentionally duplicated here.
function decodeJwtExpiry(token: string): number {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp ?? 0;
  } catch {
    return 0;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const accessToken = request.cookies.get('sl_access')?.value;
  const isValid = accessToken && decodeJwtExpiry(accessToken) * 1000 > Date.now();

  if (!isValid && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isValid && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
