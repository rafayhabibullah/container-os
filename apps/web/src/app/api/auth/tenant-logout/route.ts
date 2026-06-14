import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'),
  );
  response.cookies.delete({ name: 'sl_tenant_access', path: '/my-storage' });
  response.cookies.delete({ name: 'sl_tenant_refresh', path: '/my-storage' });
  return response;
}
