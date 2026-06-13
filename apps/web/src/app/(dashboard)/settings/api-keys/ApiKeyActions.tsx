'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

interface Props { type: 'create' | 'revoke'; apiKeyId?: string; }

const inputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  width: '192px',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

export default function ApiKeyActions({ type, apiKeyId }: Props) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  if (type === 'revoke') {
    return (
      <button
        onClick={async () => {
          if (!confirm(t('dashboard.settings.apiKeys.form.confirmRevoke'))) return;
          setLoading(true);
          try {
            const res = await fetch(`/api/settings/api-keys/${apiKeyId}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            router.refresh();
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('dashboard.settings.apiKeys.form.failed'));
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
      >
        {loading ? t('dashboard.settings.apiKeys.form.revoking') : t('dashboard.settings.apiKeys.form.revoke')}
      </button>
    );
  }

  if (newKey) {
    return (
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', margin: '0 0 10px' }}>
          {t('dashboard.settings.apiKeys.form.copyKey')}
        </p>
        <code style={{ display: 'block', background: '#ffffff', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#0f172a' }}>
          {newKey}
        </code>
        <button
          onClick={() => { setNewKey(null); router.refresh(); }}
          style={{ marginTop: '12px', background: 'none', border: 'none', color: '#92400e', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {t('dashboard.settings.apiKeys.form.iCopied')}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const form = new FormData(e.currentTarget);
        try {
          const res = await fetch('/api/settings/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.get('name'), scopes: [] }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message ?? t('dashboard.settings.apiKeys.form.failed'));
          setNewKey(data.rawKey);
          (e.target as HTMLFormElement).reset();
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : t('dashboard.settings.apiKeys.form.failed'));
        } finally {
          setLoading(false);
        }
      }}
      style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}
    >
      <div>
        <label style={labelStyle}>{t('dashboard.settings.apiKeys.form.clientName')}</label>
        <input name="name" type="text" required placeholder="Mobile App" style={inputStyle} />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          background: '#0f172a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 700,
          fontSize: '13px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? t('dashboard.settings.apiKeys.form.creating') : t('dashboard.settings.apiKeys.form.create')}
      </button>
      {error && (
        <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
      )}
    </form>
  );
}
