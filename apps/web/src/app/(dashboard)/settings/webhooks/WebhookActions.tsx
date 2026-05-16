'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props { type: 'create' | 'delete'; webhookId?: string; }

const inputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
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

export default function WebhookActions({ type, webhookId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function doAction(url: string, method: string, body?: object) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'delete') {
    return (
      <button
        onClick={() => { if (confirm('Delete this webhook?')) doAction(`/api/settings/webhooks/${webhookId}`, 'DELETE'); }}
        disabled={loading}
        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
      >
        {loading ? '…' : 'Delete'}
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction('/api/settings/webhooks', 'POST', {
          url: form.get('url'),
          subscriptions: (form.get('subscriptions') as string).split(',').map((s) => s.trim()).filter(Boolean),
          secret: form.get('secret'),
        });
        (e.target as HTMLFormElement).reset();
      }}
      style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}
    >
      <div>
        <label style={labelStyle}>Endpoint URL</label>
        <input name="url" type="url" required placeholder="https://yourapp.com/webhooks" style={{ ...inputStyle, width: '256px' }} />
      </div>
      <div>
        <label style={labelStyle}>Events (comma-separated)</label>
        <input name="subscriptions" required placeholder="invoice.paid, agreement.signed" style={{ ...inputStyle, width: '208px' }} />
      </div>
      <div>
        <label style={labelStyle}>Secret</label>
        <input name="secret" type="password" required placeholder="webhook_secret" style={{ ...inputStyle, width: '144px' }} />
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
        {loading ? 'Adding…' : 'Add endpoint'}
      </button>
      {error && (
        <p style={{ color: '#dc2626', fontSize: '13px', margin: '4px 0 0', width: '100%' }}>{error}</p>
      )}
    </form>
  );
}
