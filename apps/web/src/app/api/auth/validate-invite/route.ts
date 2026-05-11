import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const res = await fetch(`${API_URL}/v1/auth/invite/${encodeURIComponent(token)}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
