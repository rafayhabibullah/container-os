import { cookies } from 'next/headers';

export type Locale = 'en' | 'de';

export function getLocale(): Locale {
  const cookieStore = cookies();
  const locale = cookieStore.get('locale')?.value;
  return locale === 'de' ? 'de' : 'en';
}
