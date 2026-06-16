const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export async function platformFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.PLATFORM_ADMIN_TOKEN;
  if (!token) throw new Error('PLATFORM_ADMIN_TOKEN is not configured');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-platform-token': token,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Platform API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
