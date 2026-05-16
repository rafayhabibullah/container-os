import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'terminated';
  billingCycle: 'monthly' | 'fixed_term';
  effectiveFrom: string | null;
  createdAt: string;
}

const STATUS_PILL: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  draft:             { dot: '#94a3b8', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  pending_signature: { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  signed:            { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  active:            { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  terminated:        { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_PILL[status] ?? STATUS_PILL.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
      {status.replace('_', ' ')}
    </span>
  );
}

export default async function AgreementsPage() {
  const user = await requireAuth();
  const agreements = await serverFetch<Agreement[]>(
    `/v1/organisations/${user.organisationId}/agreements`,
  ).catch(() => [] as Agreement[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row { background: #ffffff; } .tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Agreements</h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              {agreements.length} agreement{agreements.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Search bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Search agreements…" readOnly style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }} />
          </div>

          {/* Table / empty state */}
          {agreements.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>No agreements found.</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Tenant</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Billing</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Effective from</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Status</th>
                    <th style={{ padding: '10px 16px' }} />
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((a) => (
                    <tr key={a.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#94a3b8' }}>{a.id.slice(0, 12)}…</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#475569' }}>{a.tenantId.slice(0, 10)}…</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', textTransform: 'capitalize' }}>{a.billingCycle.replace('_', ' ')}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusPill status={a.status} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Link href={`/agreements/${a.id}`} style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
