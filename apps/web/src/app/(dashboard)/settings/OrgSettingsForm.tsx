'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Organisation {
  id: string;
  legalName: string;
  tradingName: string | null;
  billingEmail: string;
  supportEmail: string | null;
  phone: string | null;
  website: string | null;
  vatId: string | null;
  taxNumber: string | null;
}

const inputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const disabledInputStyle: React.CSSProperties = {
  ...inputStyle,
  background: '#f1f5f9',
  color: '#94a3b8',
  cursor: 'not-allowed',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

export default function OrgSettingsForm({ org }: { org: Organisation }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const body: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value.trim()) body[key] = value.trim();
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to save settings');
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div>
        <label style={labelStyle}>Legal name</label>
        <input value={org.legalName} disabled style={disabledInputStyle} readOnly />
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>
          Contact support to change your legal name.
        </p>
      </div>

      <div>
        <label style={labelStyle}>Trading name</label>
        <input name="tradingName" type="text" defaultValue={org.tradingName ?? ''} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Billing email</label>
        <input name="billingEmail" type="email" defaultValue={org.billingEmail} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Support email</label>
        <input name="supportEmail" type="email" defaultValue={org.supportEmail ?? ''} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Phone</label>
        <input name="phone" type="text" defaultValue={org.phone ?? ''} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Website</label>
        <input name="website" type="text" defaultValue={org.website ?? ''} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>VAT ID</label>
        <input name="vatId" type="text" defaultValue={org.vatId ?? ''} style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>Tax number</label>
        <input name="taxNumber" type="text" defaultValue={org.taxNumber ?? ''} style={inputStyle} />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '9px 12px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', padding: '9px 12px', fontSize: '13px' }}>
          Settings saved.
        </div>
      )}

      <div>
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
          {loading ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
