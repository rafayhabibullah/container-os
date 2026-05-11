import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ACCESS_COOKIE = 'sl_access';
const REFRESH_COOKIE = 'sl_refresh';

export interface TokenPayload {
  sub: string;
  organisationId: string;
  role: 'owner' | 'operator' | 'tenant';
  type: string;
  exp: number;
}

export function decodeJwt(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value;
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(ACCESS_COOKIE, accessToken, { httpOnly: true, path: '/', sameSite: 'lax' });
  cookieStore.set(REFRESH_COOKIE, refreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });
}

export async function clearTokens(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export function getCurrentUser(): TokenPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

export async function requireAuth(): Promise<TokenPayload> {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
