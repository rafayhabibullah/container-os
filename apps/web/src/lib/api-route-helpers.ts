import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decodeJwt } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function getAuthContext() {
  const token = cookies().get('sl_access')?.value;
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  return { token, payload };
}

export async function proxyToBackend(
  path: string,
  method: string,
  token: string,
  body?: object,
): Promise<NextResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
