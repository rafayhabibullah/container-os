'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/client-api';

interface Site {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitCode: string;
  status: string;
  kind: string;
}

interface Props {
  orgId: string;
  sites: Site[];
}

const BOOKING_MODES = [
  { value: 'approval_required', label: 'Approval required' },
  { value: 'instant_booking',   label: 'Instant booking'   },
  { value: 'request_price',     label: 'Request price'     },
];

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
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

export default function NewListingButton({ orgId, sites }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [siteId,   setSiteId]   = useState('');
  const [units,    setUnits]    = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowForm(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showForm]);

  useEffect(() => {
    if (!siteId) { setUnits([]); return; }
    setUnitsLoading(true);
    fetch(`/api/sites/${siteId}/units`)
      .then((r) => r.json())
      .then((data: Unit[]) => setUnits(data.filter((u) => u.status === 'available')))
      .catch(() => setUnits([]))
      .finally(() => setUnitsLoading(false));
  }, [siteId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const priceRaw = form.get('publicPriceMinor') as string;
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings`, {
        method: 'POST',
        body: JSON.stringify({
          siteId:           form.get('siteId'),
          unitId:           form.get('unitId'),
          title:            form.get('title'),
          description:      form.get('description') || undefined,
          bookingMode:      form.get('bookingMode'),
          showPrice:        form.get('showPrice') === 'true',
          publicPriceMinor: priceRaw ? Math.round(parseFloat(priceRaw) * 100) : undefined,
        }),
      });
      router.refresh();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const modal = mounted && showForm ? createPortal(
    <>
      <style>{`
        @keyframes listing-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes listing-modal-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .listing-modal-backdrop { animation: listing-backdrop-in 0.18s ease both; }
        .listing-modal-card     { animation: listing-modal-in    0.22s ease both; }
        .listing-modal-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      <div
        className="listing-modal-backdrop"
        onClick={() => setShowForm(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        <div
          className="listing-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>New listing</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>Publish a unit to the marketplace</p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Site */}
            <div>
              <label style={labelStyle}>SITE</label>
              <select
                name="siteId"
                required
                value={siteId}
                onChange={(e) => { setSiteId(e.target.value); }}
                className="listing-modal-input"
                style={inputStyle}
              >
                <option value="">Select a site…</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label style={labelStyle}>UNIT</label>
              <select name="unitId" required disabled={!siteId || unitsLoading} className="listing-modal-input" style={{ ...inputStyle, opacity: (!siteId || unitsLoading) ? 0.6 : 1 }}>
                <option value="">{unitsLoading ? 'Loading units…' : !siteId ? 'Select a site first…' : units.length === 0 ? 'No available units' : 'Select a unit…'}</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.unitCode} ({u.kind.replace('_', ' ')})</option>)}
              </select>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>LISTING TITLE</label>
              <input name="title" required placeholder="e.g. 20ft Container — Drive-up access" className="listing-modal-input" style={inputStyle} />
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>DESCRIPTION <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
              <textarea name="description" placeholder="Additional details visible to customers…" rows={2} className="listing-modal-input" style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
            </div>

            {/* Booking mode */}
            <div>
              <label style={labelStyle}>BOOKING MODE</label>
              <select name="bookingMode" required defaultValue="approval_required" className="listing-modal-input" style={inputStyle}>
                {BOOKING_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {/* Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>PRICE / MONTH (€) <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
                <input name="publicPriceMinor" type="number" min="0" step="0.01" placeholder="e.g. 119.00" className="listing-modal-input" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>
                  <input type="checkbox" name="showPrice" value="true" defaultChecked style={{ marginRight: '6px' }} />
                  Show price publicly
                </label>
              </div>
            </div>

            {error && (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '2px' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} style={{ flex: 2, background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', transition: 'background 0.15s' }}>
                {loading ? 'Creating…' : 'Create listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={() => { setError(''); setSiteId(''); setUnits([]); setShowForm(true); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#0f172a', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', boxShadow: '0 1px 2px rgba(15,23,42,0.15)', whiteSpace: 'nowrap' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        New listing
      </button>
      {modal}
    </>
  );
}
