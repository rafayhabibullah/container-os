import { cookies } from 'next/headers';
import { t as translate, type Locale } from '@sitelager/i18n';
import { LOCALE_COOKIE } from './locale-cookie';

export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  return cookie === 'en' ? 'en' : 'de';
}

export function getT() {
  const locale = getLocale();
  return (key: string, vars?: Record<string, string>) => translate(locale, key, vars);
}
