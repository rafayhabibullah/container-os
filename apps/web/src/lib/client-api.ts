export async function clientFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, method: init?.method ?? 'GET', body: init?.body }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? `Request failed ${res.status}`);
  }
  return res.json();
}
