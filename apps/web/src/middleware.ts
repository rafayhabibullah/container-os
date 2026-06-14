import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PREFIX_PATHS = [
  '/login', '/register', '/accept-invite',
  '/my-storage/register',
  '/api/auth', '/api/checkout', '/api/tenant', '/api/rpc',
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
      return NextResponse.redirect(new URL('/login', request.url));
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

  if (pathname === '/login' || pathname === '/register') {
    const tenantToken = request.cookies.get('sl_tenant_access')?.value;
    const tenantDecoded = tenantToken ? decodeJwt(tenantToken) : {};
    const isTenantValid = tenantToken && (tenantDecoded.exp ?? 0) * 1000 > Date.now();

    if (isTenantValid && tenantDecoded.type === 'tenant') {
      return NextResponse.redirect(new URL('/my-storage', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
