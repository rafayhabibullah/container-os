'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
}

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

export default function SiteEditForm({ site }: { site: Site }) {
  const router = useRouter();
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          address: {
            street:     form.get('street'),
            city:       form.get('city'),
            postalCode: form.get('postalCode'),
            country:    form.get('country'),
          },
          timezone: form.get('timezone'),
          status:   form.get('status'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update site');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message ?? 'Failed to delete site'); }
      router.push('/sites');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleteLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>SITE NAME</label>
        <input name="name" type="text" required defaultValue={site.name} style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>STREET</label>
          <input name="street" type="text" required defaultValue={site.address.street} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>CITY</label>
          <input name="city" type="text" required defaultValue={site.address.city} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>POSTAL CODE</label>
          <input name="postalCode" type="text" required defaultValue={site.address.postalCode} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>COUNTRY</label>
          <input name="country" type="text" required defaultValue={site.address.country} maxLength={2} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>TIMEZONE</label>
          <input name="timezone" type="text" required defaultValue={site.timezone} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>STATUS</label>
          <select name="status" defaultValue={site.status} style={inputStyle}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error && (
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <a href="/sites" style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '10px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Cancel
          </a>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteLoading}
          style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {deleteLoading ? 'Deleting…' : 'Delete site'}
        </button>
      </div>
    </form>
  );
}
