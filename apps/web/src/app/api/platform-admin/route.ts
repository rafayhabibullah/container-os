import { NextRequest, NextResponse } from 'next/server';
import { platformFetch } from '@/lib/platform-api';

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body?.path || typeof body.path !== 'string' || !body.path.startsWith('/platform/v1/')) {
    return NextResponse.json({ message: 'Invalid platform path' }, { status: 400 });
  }
  const method = body.path.includes('/feature-flags/') ? 'PUT' : 'POST';
  const result = await platformFetch(body.path, {
    method,
    body: body.body ? JSON.stringify(body.body) : undefined,
  });
  return NextResponse.json(result);
}
