const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface RegisterBody {
  organisationName: string;
  ownerName: string;
  email: string;
  password: string;
  countryCode?: string;
  defaultLanguage?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface AcceptInviteBody {
  token: string;
  name: string;
  password: string;
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    register: (body: RegisterBody) =>
      apiFetch('/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: LoginBody) =>
      apiFetch('/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    refresh: (refreshToken: string) =>
      apiFetch('/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    validateInvite: (token: string) => apiFetch(`/v1/auth/invite/${token}`),
    acceptInvite: (body: AcceptInviteBody) =>
      apiFetch('/v1/auth/accept-invite', { method: 'POST', body: JSON.stringify(body) }),
  },
};
