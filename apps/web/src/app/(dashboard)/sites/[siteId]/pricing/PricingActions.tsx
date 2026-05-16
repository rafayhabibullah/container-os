'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface UnitType { id: string; name: string; }

interface Props {
  type: 'create-book' | 'book-actions' | 'add-rule' | 'remove-rule';
  siteId: string;
  priceBookId?: string;
  rateRuleId?: string;
  bookStatus?: string;
  unitTypes: UnitType[];
}

const inputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0f172a',
  outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '5px 11px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  color: '#64748b',
  fontSize: '12px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export default function PricingActions({ type, siteId, priceBookId, rateRuleId, bookStatus, unitTypes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);

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
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'create-book') {
    return showForm ? (
      <form
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          await doAction(`/api/sites/${siteId}/price-books`, 'POST', {
            name: form.get('name'), effectiveFrom: form.get('effectiveFrom'),
          });
        }}
        style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <input name="name" placeholder="Book name" required style={{ ...inputStyle, width: '160px' }} />
        <input name="effectiveFrom" type="date" required style={inputStyle} />
        <button type="submit" disabled={loading} style={{ background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {loading ? '…' : 'Create'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} style={{ ...btnStyle, background: 'none', border: 'none' }}>Cancel</button>
        {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }}>{error}</p>}
      </form>
    ) : (
      <button
        onClick={() => setShowForm(true)}
        style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        + New price book
      </button>
    );
  }

  if (type === 'book-actions') {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {bookStatus === 'draft' && (
          <button
            onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/publish`, 'POST')}
            disabled={loading}
            style={{ ...btnStyle, color: '#15803d', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? '…' : 'Publish'}
          </button>
        )}
        {bookStatus === 'published' && (
          <button
            onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/archive`, 'POST')}
            disabled={loading}
            style={{ ...btnStyle, opacity: loading ? 0.5 : 1 }}
          >
            {loading ? '…' : 'Archive'}
          </button>
        )}
        {error && <span style={{ fontSize: '11px', color: '#dc2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</span>}
      </div>
    );
  }

  if (type === 'remove-rule') {
    return (
      <button
        onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/rate-rules/${rateRuleId}`, 'DELETE')}
        disabled={loading}
        style={{ ...btnStyle, color: '#dc2626', opacity: loading ? 0.5 : 1 }}
      >
        {loading ? '…' : 'Remove'}
      </button>
    );
  }

  // add-rule
  return showForm ? (
    <form
      onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction(`/api/sites/${siteId}/price-books/${priceBookId}/rate-rules`, 'POST', {
          unitTypeId:   form.get('unitTypeId'),
          amountMinor:  Math.round(parseFloat(form.get('amountEur') as string) * 100),
          billingCycle: form.get('billingCycle'),
        });
      }}
      style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}
    >
      <select name="unitTypeId" required style={inputStyle}>
        <option value="">Unit type…</option>
        {unitTypes.map((ut) => <option key={ut.id} value={ut.id}>{ut.name}</option>)}
      </select>
      <input name="amountEur" type="number" step="0.01" min="0" placeholder="Price (€)" required style={{ ...inputStyle, width: '110px' }} />
      <select name="billingCycle" style={inputStyle}>
        <option value="monthly">Monthly</option>
        <option value="fixed_term">Fixed term</option>
      </select>
      <button type="submit" disabled={loading} style={{ background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {loading ? '…' : 'Add rule'}
      </button>
      <button type="button" onClick={() => setShowForm(false)} style={{ ...btnStyle, background: 'none', border: 'none' }}>Cancel</button>
      {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }}>{error}</p>}
    </form>
  ) : (
    <button onClick={() => setShowForm(true)} style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      + Add rate rule
    </button>
  );
}
