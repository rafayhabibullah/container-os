import de from './locales/de.json';
import en from './locales/en.json';

export type Locale = 'de' | 'en';
export type TranslationKey = string;

const locales: Record<Locale, Record<string, unknown>> = { de, en };

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj) as string | undefined;
}

export function t(locale: Locale, key: TranslationKey, vars?: Record<string, string>): string {
  const template = getNestedValue(locales[locale] ?? locales['de'], key) ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, 'g'), v),
    template,
  );
}

export { de, en };
