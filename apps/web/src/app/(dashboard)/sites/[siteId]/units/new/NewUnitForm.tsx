'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }

const inputStyle: React.CSSProperties = {
  width: '100%',
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
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function NewUnitForm({ siteId, unitTypes }: { siteId: string; unitTypes: UnitType[] }) {
  const router = useRouter();
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode:   form.get('unitCode'),
          unitTypeId: form.get('unitTypeId'),
          kind:       form.get('kind'),
          driveUp:    form.get('driveUp') === 'on',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create unit');
      router.push(`/sites/${siteId}/units`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>UNIT CODE</label>
        <input name="unitCode" type="text" required placeholder="A-101" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>UNIT TYPE</label>
        <select name="unitTypeId" required style={inputStyle}>
          <option value="">Select a unit type…</option>
          {unitTypes.map((ut) => (
            <option key={ut.id} value={ut.id}>{ut.name} ({ut.sizeSqm}m²)</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>KIND</label>
        <select name="kind" style={inputStyle}>
          <option value="self_storage">Self Storage</option>
          <option value="container">Container</option>
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input name="driveUp" type="checkbox" id="driveUp" style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
        <label htmlFor="driveUp" style={{ fontSize: '14px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>Drive-up access</label>
      </div>

      {error && (
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="submit"
          disabled={loading}
          style={{ background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {loading ? 'Creating…' : 'Create unit'}
        </button>
        <Link href={`/sites/${siteId}/units`} style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '10px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
