'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { clientFetch } from '@/lib/client-api';

interface Props {
  listingId: string;
  orgId: string;
  status: string;
  title: string;
  description: string | null;
  bookingMode: string;
  publicPriceMinor: number | null;
  showPrice: boolean;
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

export function ListingActions({ listingId, orgId, status, title, description, bookingMode, publicPriceMinor, showPrice }: Props) {
  const router = useRouter();
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showEdit,  setShowEdit]  = useState(false);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  async function transition(action: 'publish' | 'pause' | 'archive') {
    setLoading(true);
    setError('');
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}/${action}`, { method: 'POST' });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    const form = new FormData(e.currentTarget);
    const priceRaw = form.get('publicPriceMinor') as string;
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title:            form.get('title'),
          description:      (form.get('description') as string) || undefined,
          bookingMode:      form.get('bookingMode'),
          showPrice:        form.get('showPrice') === 'true',
          publicPriceMinor: priceRaw ? Math.round(parseFloat(priceRaw) * 100) : undefined,
        }),
      });
      router.refresh();
      setShowEdit(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setEditLoading(false);
    }
  }

  const btnStyle: React.CSSProperties = {
    padding: '5px 11px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#64748b',
    fontSize: '12px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.12s, color 0.12s',
  };

  const hover = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      const b = e.currentTarget;
      b.style.background = '#f1f5f9';
      b.style.color = '#0f172a';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      const b = e.currentTarget;
      b.style.background = '#f8fafc';
      b.style.color = '#64748b';
    },
  };

  const modal = showEdit ? createPortal(
    <>
      <style>{`
        @keyframes edit-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes edit-modal-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .edit-modal-backdrop { animation: edit-backdrop-in 0.18s ease both; }
        .edit-modal-card     { animation: edit-modal-in    0.22s ease both; }
        .edit-modal-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      <div
        className="edit-modal-backdrop"
        onClick={() => setShowEdit(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        <div
          className="edit-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Edit listing</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>Update title, description, mode, or price</p>
            </div>
            <button
              onClick={() => setShowEdit(false)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleEdit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>LISTING TITLE</label>
              <input name="title" required defaultValue={title} className="edit-modal-input" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>DESCRIPTION <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
              <textarea name="description" defaultValue={description ?? ''} rows={2} className="edit-modal-input" style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
            </div>

            <div>
              <label style={labelStyle}>BOOKING MODE</label>
              <select name="bookingMode" required defaultValue={bookingMode} className="edit-modal-input" style={inputStyle}>
                {BOOKING_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>PRICE / MONTH (€) <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
                <input
                  name="publicPriceMinor"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={publicPriceMinor != null ? (publicPriceMinor / 100).toFixed(2) : ''}
                  className="edit-modal-input"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>
                  <input type="checkbox" name="showPrice" value="true" defaultChecked={showPrice} style={{ marginRight: '6px' }} />
                  Show price publicly
                </label>
              </div>
            </div>

            {editError && (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
                {editError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '2px' }}>
              <button type="button" onClick={() => setShowEdit(false)} style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px' }}>
                Cancel
              </button>
              <button type="submit" disabled={editLoading} style={{ flex: 2, background: editLoading ? '#e2e8f0' : '#0f172a', color: editLoading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px', cursor: editLoading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', transition: 'background 0.15s' }}>
                {editLoading ? 'Saving…' : 'Save changes'}
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
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button onClick={() => { setEditError(''); setShowEdit(true); }} disabled={loading} style={btnStyle} {...hover}>
          Edit
        </button>
        {status === 'draft' && (
          <button onClick={() => transition('publish')} disabled={loading} style={btnStyle} {...hover}>
            Publish
          </button>
        )}
        {status === 'published' && (
          <button onClick={() => transition('pause')} disabled={loading} style={btnStyle} {...hover}>
            Pause
          </button>
        )}
        {status !== 'archived' && (
          <button onClick={() => transition('archive')} disabled={loading} style={btnStyle} {...hover}>
            Archive
          </button>
        )}
        {error && (
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#dc2626' }}>
            {error}
          </span>
        )}
      </div>
      {modal}
    </>
  );
}
