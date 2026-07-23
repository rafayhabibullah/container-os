import { NextRequest, NextResponse } from 'next/server';
import { backendApi } from '@/lib/backend-url';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  let res: Response;
  try {
    res = await fetch(backendApi(`/v1/auth/invite/${encodeURIComponent(token)}`));
  } catch {
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'API server is not reachable. Please start the backend and try again.' } },
      { status: 503 },
    );
  }
  const data = await res.json().catch(() => ({
    error: { code: 'INVALID_BACKEND_RESPONSE', message: 'API server returned an invalid response.' },
  }));
  return NextResponse.json(data, { status: res.status });
}
