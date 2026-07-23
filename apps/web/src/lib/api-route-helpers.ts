import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decodeJwt } from './auth';
import { backendApi } from './backend-url';

export function getAuthContext() {
  const token = cookies().get('sl_access')?.value;
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  return { token, payload };
}

export function getTenantAuthContext() {
  const token = cookies().get('sl_tenant_access')?.value;
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
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }
  const res = await fetch(backendApi(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
