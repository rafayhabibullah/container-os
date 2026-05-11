import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'),
  );
  response.cookies.delete('sl_access');
  response.cookies.delete('sl_refresh');
  return response;
}
