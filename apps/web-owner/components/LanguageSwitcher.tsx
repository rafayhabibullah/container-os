'use client';
import { useTransition } from 'react';
import { setLocale } from '../app/actions/locale';

export function LanguageSwitcher({ current }: { current: 'en' | 'de' }) {
  const [pending, startTransition] = useTransition();
  const next = current === 'en' ? 'de' : 'en';

  return (
    <button
      onClick={() => startTransition(() => setLocale(next))}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors disabled:opacity-50"
      title={next === 'de' ? 'Auf Deutsch wechseln' : 'Switch to English'}
    >
      {pending ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent" />
      ) : (
        <span>{next === 'de' ? '🇩🇪' : '🇬🇧'}</span>
      )}
      {next === 'de' ? 'DE' : 'EN'}
    </button>
  );
}
