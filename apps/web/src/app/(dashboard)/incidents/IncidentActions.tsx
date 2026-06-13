'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

interface Site {
  id: string;
  name: string;
}

interface Props {
  type: 'report' | 'update';
  incidentId?: string;
  currentStatus?: string;
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

export default function IncidentActions({ type, incidentId, currentStatus, sites = [] }: Props) {
  const t = useT();
  const router = useRouter();
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const [units,     setUnits]     = useState<{ id: string; unitCode: string }[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowForm(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showForm]);

  async function doAction(url: string, method: string, body?: object) {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body:    body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? t('dashboard.incidents.report.failed'));
      router.refresh();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.incidents.report.failed'));
    } finally {
      setLoading(false);
    }
  }

  /* ── Report form ─────────────────────────────────────────────────────── */
  if (type === 'report') {
    const modal = mounted && showForm ? createPortal(
      <>
        <style>{`
          @keyframes backdrop-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes modal-in {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0)    scale(1);    }
          }
          .inc-modal-backdrop { animation: backdrop-in 0.18s ease both; }
          .inc-modal-card     { animation: modal-in    0.22s ease both; }
          .inc-modal-input:focus {
            border-color: #94a3b8 !important;
            box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important;
          }
        `}</style>

        {/* Backdrop */}
        <div
          className="inc-modal-backdrop"
          onClick={() => setShowForm(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          {/* Modal card */}
          <div
            className="inc-modal-card"
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
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px 16px',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '16px', fontWeight: 700,
                  color: '#0f172a', margin: 0,
                }}>
                  {t('dashboard.incidents.report.heading')}
                </p>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px', color: '#94a3b8',
                  margin: '3px 0 0',
                }}>
                  {t('dashboard.incidents.report.subheading')}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '6px', width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#64748b', fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Form body */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const unitId = form.get('unitId') as string;
                await doAction('/api/incidents', 'POST', {
                  siteId:   form.get('siteId'),
                  unitId:   unitId || undefined,
                  title:    form.get('type'),
                  severity: form.get('severity'),
                });
              }}
              style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label style={labelStyle}>{t('dashboard.incidents.report.site')}</label>
                <select
                  name="siteId"
                  required
                  className="inc-modal-input"
                  style={inputStyle}
                  onChange={async (e) => {
                    const siteId = e.target.value;
                    setUnits([]);
                    if (!siteId) return;
                    setLoadingUnits(true);
                    try {
                      const res = await fetch(`/api/sites/${siteId}/units`);
                      const data = await res.json().catch(() => []);
                      setUnits(Array.isArray(data) ? data : []);
                    } finally {
                      setLoadingUnits(false);
                    }
                  }}
                >
                  <option value="">{t('dashboard.incidents.report.selectSite')}</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{t('dashboard.incidents.report.unit')} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t('dashboard.incidents.report.optional')}</span></label>
                <select name="unitId" className="inc-modal-input" style={{ ...inputStyle, color: loadingUnits ? '#94a3b8' : undefined }} disabled={loadingUnits || units.length === 0}>
                  <option value="">{loadingUnits ? t('dashboard.incidents.report.loadingUnits') : units.length === 0 ? t('dashboard.incidents.report.selectSiteFirst') : t('dashboard.incidents.report.allUnits')}</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.unitCode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{t('dashboard.incidents.report.description')}</label>
                <input
                  name="type"
                  placeholder={t('dashboard.incidents.report.descriptionPlaceholder')}
                  required
                  className="inc-modal-input"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>{t('dashboard.incidents.report.severity')}</label>
                <select name="severity" className="inc-modal-input" style={inputStyle}>
                  <option value="low">{t('dashboard.incidents.report.severityLow')}</option>
                  <option value="medium">{t('dashboard.incidents.report.severityMedium')}</option>
                  <option value="high">{t('dashboard.incidents.report.severityHigh')}</option>
                  <option value="critical">{t('dashboard.incidents.report.severityCritical')}</option>
                </select>
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

              {/* Footer actions */}
              <div style={{
                display: 'flex', gap: '8px', paddingTop: '4px',
                borderTop: '1px solid #f1f5f9', marginTop: '2px',
              }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '8px', padding: '10px',
                    color: '#64748b', cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600, fontSize: '13px',
                  }}
                >
                  {t('dashboard.incidents.report.cancel')}
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
                  {loading ? t('dashboard.incidents.report.submitting') : t('dashboard.incidents.report.submit')}
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
          {t('dashboard.incidents.reportIncident')}
        </button>
        {modal}
      </>
    );
  }

  /* ── Status transition buttons ───────────────────────────────────────── */
  const transitions: Record<string, string[]> = {
    open:          ['investigating', 'resolved'],
    investigating: ['resolved'],
  };
  const next = transitions[currentStatus ?? 'open'] ?? [];
  if (next.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {next.map((status) => (
        <button
          key={status}
          onClick={() => doAction(`/api/incidents/${incidentId}`, 'PATCH', { status })}
          disabled={loading}
          className="action-ghost"
          style={{
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
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'investigating' ? t('dashboard.incidents.actionLabel.investigating') : t('dashboard.incidents.actionLabel.resolved')}
        </button>
      ))}
      {error && (
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#dc2626' }}>
          {error}
        </span>
      )}
    </div>
  );
}
