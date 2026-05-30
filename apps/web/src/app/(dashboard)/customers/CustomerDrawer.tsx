'use client';

import { useEffect, useState } from 'react';

interface CustomerSummary {
  id: string;
  type: 'person' | 'organisation';
  personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
  contacts: { email: string }[];
  createdAt: string;
}

interface CustomerDetails {
  id: string;
  type: string;
  personOrOrgData: Record<string, string>;
  createdAt: string;
  contacts: { email: string; phone?: string; role: string }[];
  agreements: {
    id: string;
    status: string;
    siteName: string;
    unitId: string;
    effectiveFrom: string | null;
    billingCycle: string;
    createdAt: string;
  }[];
}

const AGREEMENT_STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  draft:             { dot: '#94a3b8', text: '#64748b',  bg: '#f8fafc', border: '#e2e8f0', label: 'Draft'             },
  pending_signature: { dot: '#0ea5e9', text: '#0369a1',  bg: '#f0f9ff', border: '#bae6fd', label: 'Pending signature' },
  active:            { dot: '#16a34a', text: '#15803d',  bg: '#f0fdf4', border: '#bbf7d0', label: 'Active'            },
  terminated:        { dot: '#f87171', text: '#dc2626',  bg: '#fef2f2', border: '#fecaca', label: 'Terminated'        },
  expired:           { dot: '#cbd5e1', text: '#94a3b8',  bg: '#f8fafc', border: '#e2e8f0', label: 'Expired'          },
};

function displayName(c: CustomerSummary): string {
  const d = c.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || c.id;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{value ?? <span style={{ color: '#cbd5e1' }}>—</span>}</span>
    </div>
  );
}

function SkeletonLine({ width = '100%', height = 14 }: { width?: string; height?: number }) {
  return <div style={{ width, height, background: '#f1f5f9', borderRadius: '4px', animation: 'skeleton-pulse 1.4s ease infinite' }} />;
}

export default function CustomerDrawer({ customer, onClose }: { customer: CustomerSummary; onClose: () => void }) {
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [fetching, setFetching] = useState(true);

  const name  = displayName(customer);
  const email = customer.contacts[0]?.email;
  const initials = name.slice(0, 2).toUpperCase();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setFetching(true);
    fetch(`/api/customers/${customer.id}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: CustomerDetails) => setDetails(d))
      .catch(() => setDetails(null))
      .finally(() => setFetching(false));
  }, [customer.id]);

  return (
    <>
      <style>{`
        @keyframes drawer-backdrop  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes drawer-slide     { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes skeleton-pulse   { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
        .cust-drawer-backdrop { animation: drawer-backdrop 0.2s ease both; }
        .cust-drawer-panel    { animation: drawer-slide 0.25s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div
        className="cust-drawer-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 40, backdropFilter: 'blur(2px)' }}
      />

      <div
        className="cust-drawer-panel"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
          background: '#ffffff', zIndex: 50, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '15px', fontWeight: 700,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>{name}</div>
            {email && <div style={{ fontSize: '13px', color: '#64748b' }}>{email}</div>}
            <div style={{ marginTop: '8px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
              }}>
                {customer.type === 'organisation' ? 'Organisation' : 'Person'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, color: '#64748b',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="ID" value={<span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>{customer.id.slice(0, 12)}…</span>} />
            <Field label="Member since" value={new Date(customer.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </div>

          {/* Contacts */}
          {fetching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SkeletonLine width="30%" height={11} />
              <SkeletonLine width="55%" />
              <SkeletonLine width="40%" />
            </div>
          ) : details && details.contacts.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>Contact</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {details.contacts.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0f172a' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{c.email}</span>
                  </div>
                ))}
                {details.contacts.filter((c) => c.phone).map((c, i) => (
                  <div key={`p${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0f172a' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agreements */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>Agreements</div>
            {fetching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <SkeletonLine width="50%" />
                  <SkeletonLine width="70%" />
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <SkeletonLine width="60%" />
                  <SkeletonLine width="40%" />
                </div>
              </div>
            ) : !details ? (
              <span style={{ fontSize: '12px', color: '#f87171' }}>Could not load — check the API server is running.</span>
            ) : details.agreements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>No agreements</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {details.agreements.map((a) => {
                  const stat = AGREEMENT_STATUS[a.status] ?? AGREEMENT_STATUS.draft;
                  return (
                    <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>{a.id.slice(0, 10)}…</span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`,
                          borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                        }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: stat.dot }} />
                          {stat.label}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <Field label="Site" value={a.siteName} />
                        <Field label="Cycle" value={a.billingCycle} />
                        {a.effectiveFrom && <Field label="From" value={new Date(a.effectiveFrom).toLocaleDateString('de-DE')} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
