import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'),
  );
  response.cookies.delete('sl_tenant_access');
  response.cookies.delete('sl_tenant_refresh');
  return response;
}
