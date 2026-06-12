'use client';

import { useLocale } from '@/lib/i18n';

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {(['de', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 600,
            background: locale === l ? '#0f172a' : '#ffffff',
            color: locale === l ? '#ffffff' : '#475569',
            cursor: 'pointer',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
