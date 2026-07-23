import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';

export const PLATFORM_ADMIN_COOKIE = 'sl_platform_admin';

export function configuredPlatformToken() {
  return process.env.PLATFORM_ADMIN_TOKEN;
}

export function isValidPlatformToken(candidate: string | undefined | null) {
  const expected = configuredPlatformToken();
  if (!expected || !candidate) return false;
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function hasPlatformAdminSession() {
  return isValidPlatformToken(cookies().get(PLATFORM_ADMIN_COOKIE)?.value);
}
