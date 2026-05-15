'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface Site {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitCode: string;
}

interface Props {
  sites?: Site[];
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
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

export default function InspectionActions({ sites = [] }: Props) {
  const router = useRouter();
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [units,        setUnits]        = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showForm]);

  function closeModal() {
    setShowForm(false);
    setUnits([]);
    setError('');
  }

  async function onSiteChange(siteId: string) {
    setUnits([]);
    if (!siteId) return;
    setUnitsLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/units`);
      if (res.ok) setUnits(await res.json());
    } finally {
      setUnitsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId:    form.get('siteId'),
          unitId:    form.get('unitId'),
          kind:      form.get('kind'),
          checklist: [{ code: form.get('checklistCode'), result: form.get('checklistResult') }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.refresh();
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const modal = mounted && showForm ? createPortal(
    <>
      <style>{`
        @keyframes insp-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes insp-modal-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .insp-modal-backdrop { animation: insp-backdrop-in 0.18s ease both; }
        .insp-modal-card     { animation: insp-modal-in    0.22s ease both; }
        .insp-modal-input:focus {
          border-color: #94a3b8 !important;
          box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important;
        }
      `}</style>

      <div
        className="insp-modal-backdrop"
        onClick={closeModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          className="insp-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)',
            width: '100%',
            maxWidth: '440px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 24px 16px',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                New inspection
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>
                Record a unit inspection with checklist
              </p>
            </div>
            <button
              onClick={closeModal}
              style={{
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '6px', width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div>
              <label style={labelStyle}>SITE</label>
              <select
                name="siteId"
                required
                className="insp-modal-input"
                style={inputStyle}
                onChange={(e) => onSiteChange(e.target.value)}
              >
                <option value="">Select a site…</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>UNIT</label>
              <select
                name="unitId"
                required
                disabled={units.length === 0}
                className="insp-modal-input"
                style={{ ...inputStyle, opacity: units.length === 0 ? 0.5 : 1 }}
              >
                <option value="">
                  {unitsLoading ? 'Loading units…' : units.length === 0 ? 'Select a site first' : 'Select a unit…'}
                </option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.unitCode}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>INSPECTION TYPE</label>
              <select name="kind" className="insp-modal-input" style={inputStyle}>
                <option value="move_in">Move in</option>
                <option value="move_out">Move out</option>
                <option value="routine">Routine</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>CHECK CODE</label>
                <input
                  name="checklistCode"
                  placeholder="e.g. DOOR, LOCK"
                  required
                  className="insp-modal-input"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>RESULT</label>
                <select name="checklistResult" className="insp-modal-input" style={inputStyle}>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="na">N/A</option>
                </select>
              </div>
            </div>

            {error && (
              <p style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '13px', color: '#dc2626',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '6px', padding: '9px 12px', margin: 0,
              }}>
                {error}
              </p>
            )}

            <div style={{
              display: 'flex', gap: '8px', paddingTop: '4px',
              borderTop: '1px solid #f1f5f9', marginTop: '2px',
            }}>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '10px',
                  color: '#64748b', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600, fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  background: loading ? '#e2e8f0' : '#0f172a',
                  color: loading ? '#94a3b8' : '#ffffff',
                  border: 'none', borderRadius: '8px', padding: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700, fontSize: '13px',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Saving…' : 'Save inspection'}
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
        onClick={() => { setError(''); setShowForm(true); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: '#0f172a', color: '#ffffff',
          padding: '10px 18px', borderRadius: '8px', border: 'none',
          cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700, fontSize: '13px',
          boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        New inspection
      </button>
      {modal}
    </>
  );
}
