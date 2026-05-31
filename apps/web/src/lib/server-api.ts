import { getAccessToken, getTenantAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(token: string | undefined, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
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
