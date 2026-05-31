import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ACCESS_COOKIE = 'sl_access';
const REFRESH_COOKIE = 'sl_refresh';
const TENANT_ACCESS_COOKIE = 'sl_tenant_access';
const TENANT_REFRESH_COOKIE = 'sl_tenant_refresh';

export interface TokenPayload {
  sub: string;
  organisationId: string;
  role: 'owner' | 'operator' | 'tenant';
  type: 'owner' | 'operator' | 'tenant';
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

export function getTenantAccessToken(): string | undefined {
  return cookies().get(TENANT_ACCESS_COOKIE)?.value;
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

export async function setTenantTokens(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(TENANT_ACCESS_COOKIE, accessToken, { httpOnly: true, path: '/my-storage', sameSite: 'lax' });
  cookieStore.set(TENANT_REFRESH_COOKIE, refreshToken, { httpOnly: true, path: '/my-storage', sameSite: 'lax' });
}

export async function clearTenantTokens(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(TENANT_ACCESS_COOKIE);
  cookieStore.delete(TENANT_REFRESH_COOKIE);
}

export function getCurrentUser(): TokenPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload || payload.exp * 1000 < Date.now()) return null;
  return payload;
}

export function getCurrentTenantUser(): TokenPayload | null {
  const token = cookies().get(TENANT_ACCESS_COOKIE)?.value;
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

export async function requireTenantAuth(): Promise<TokenPayload> {
  const user = getCurrentTenantUser();
  if (!user) redirect('/my-storage/login');
  if (user.type !== 'tenant') redirect('/my-storage/login');
  return user;
}
