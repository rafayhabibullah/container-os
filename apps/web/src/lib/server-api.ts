import { getAccessToken, getTenantAccessToken } from './auth';
import { backendApi } from './backend-url';

async function apiFetch<T>(token: string | undefined, path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('Idempotency-Key', crypto.randomUUID());
  const res = await fetch(backendApi(path), {
    ...init,
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function serverFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(getAccessToken(), path, init);
}

export async function serverTenantFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(getTenantAccessToken(), path, init);
}
