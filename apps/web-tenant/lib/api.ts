const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...options?.headers }, ...options });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: { message: res.statusText } })); throw new Error(err.error?.message ?? 'API error'); }
  return res.json();
}

export const api = {
  getSites: () => apiFetch<any[]>('/public/v1/sites'),
  getAvailability: (slug: string, startDate: string) => apiFetch<any[]>(`/public/v1/sites/${slug}/availability?startDate=${startDate}`),
  getQuote: (siteId: string, unitTypeId: string, startDate: string, customerType: string) => apiFetch<any>(`/public/v1/quotes?siteId=${siteId}&unitTypeId=${unitTypeId}&startDate=${startDate}&customerType=${customerType}`),
  createCheckoutSession: (body: { siteId: string; unitTypeId: string; startDate: string }) => apiFetch<any>('/public/v1/checkout-sessions', { method: 'POST', body: JSON.stringify(body) }),
  createLead: (body: { siteId: string; name: string; email: string; source: string }) => apiFetch<any>('/public/v1/leads', { method: 'POST', body: JSON.stringify(body) }),
};
