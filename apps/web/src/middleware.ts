import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PREFIX_PATHS = [
  '/login', '/register', '/accept-invite',
  '/my-storage/login',
  '/api/auth', '/api/checkout',
  '/storage',
  '/for-operators',
  '/pricing',
  '/legal',
];
const PUBLIC_EXACT_PATHS = ['/'];

// Edge Runtime cannot import from src/lib/auth — JWT decode is intentionally duplicated here.
function decodeJwt(token: string): { exp?: number; type?: string } {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return {};
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIX_PATHS.some((p) => pathname.startsWith(p));

  const isTenantPath = pathname.startsWith('/my-storage');

  if (isTenantPath) {
    const tenantToken = request.cookies.get('sl_tenant_access')?.value;
    const decoded = tenantToken ? decodeJwt(tenantToken) : {};
    const isValid = tenantToken && (decoded.exp ?? 0) * 1000 > Date.now();

    if (!isValid && !isPublic) {
      return NextResponse.redirect(new URL('/my-storage/login', request.url));
    }
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('sl_access')?.value;
  const decoded = accessToken ? decodeJwt(accessToken) : {};
  const isValid = accessToken && (decoded.exp ?? 0) * 1000 > Date.now();

  if (!isValid && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isValid && decoded.type !== 'tenant' && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
