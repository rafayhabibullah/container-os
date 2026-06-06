'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AgreementDrawer from './AgreementDrawer';
import AgreementActions from './AgreementActions';

interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'terminated';
  billingCycle: 'monthly' | 'fixed_term';
  effectiveFrom: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  siteName: string | null;
  unitCode: string | null;
  unitTypeName: string | null;
}

interface DocumentRow {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  locale: string | null;
  createdAt: string;
}

interface Props {
  agreements: Agreement[];
  documents: DocumentRow[];
}

const STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  draft:             { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: 'Draft'             },
  pending_signature: { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Pending signature' },
  signed:            { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Signed'            },
  active:            { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Active'            },
  terminated:        { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Terminated'        },
};

const AGR_FILTERS = [
  { key: 'all',               label: 'All'               },
  { key: 'draft',             label: 'Draft'             },
  { key: 'pending_signature', label: 'Pending signature' },
  { key: 'signed',            label: 'Signed'            },
  { key: 'active',            label: 'Active'            },
  { key: 'terminated',        label: 'Terminated'        },
] as const;

const KIND_PILL: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  contract:    { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  invoice:     { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  id_document: { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

const defaultKindPill = { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' };

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px',
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function AgreementsTable({ agreements, documents }: Props) {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'agreements';
  const router = useRouter();
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected,     setSelected]     = useState<Agreement | null>(null);

  const filteredAgreements = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agreements.filter((a) => {
      const matchQ = !q ||
        a.id.toLowerCase().includes(q) ||
        (a.customerName ?? a.tenantId).toLowerCase().includes(q) ||
        (a.customerEmail ?? '').toLowerCase().includes(q) ||
        a.status.includes(q);
      const matchS = statusFilter === 'all' || a.status === statusFilter;
      return matchQ && matchS;
    });
  }, [agreements, query, statusFilter]);

  const filteredDocuments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) =>
      d.kind.toLowerCase().includes(q) || d.subjectType.toLowerCase().includes(q),
    );
  }, [documents, query]);

  const tabs = [
    { id: 'agreements', label: 'Agreements', count: agreements.length },
    { id: 'documents',  label: 'Documents',  count: documents.length  },
  ];

  return (
    <>
      {selected && <AgreementDrawer agreement={selected} onClose={() => setSelected(null)} />}
      <style>{`
        @keyframes agr-row-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .agr-row { animation: agr-row-in 0.25s ease both; }
        .agr-row:hover { background: #f8fafc !important; }
        .agr-filter-btn { transition: all 0.12s ease; }
        .agr-filter-btn:hover { color: #0f172a !important; }
        .agr-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#e2e8f0', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setQuery(''); setStatusFilter('all'); router.push(`/agreements?tab=${t.id}`); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: active ? '#ffffff' : 'transparent',
                color: active ? '#0f172a' : '#64748b',
                boxShadow: active ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {t.label}
              <span style={{ fontSize: '11px', fontWeight: 700, color: active ? '#64748b' : '#94a3b8' }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {tab === 'agreements' ? (
        <div style={{
          background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
          overflow: 'hidden',
        }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              {AGR_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                const count  = f.key === 'all' ? agreements.length : agreements.filter((a) => a.status === f.key).length;
                return (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className="agr-filter-btn"
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: 'none',
                      background: active ? '#f1f5f9' : 'transparent',
                      color: active ? '#0f172a' : '#94a3b8',
                      fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: active ? 600 : 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    {f.label}
                    <span style={{
                      background: active ? '#e2e8f0' : '#f8fafc',
                      color: active ? '#475569' : '#cbd5e1',
                      borderRadius: '4px', padding: '1px 6px',
                      fontSize: '11px', fontWeight: 600,
                      minWidth: '20px', textAlign: 'center',
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />

            <div
              className="agr-search-box"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '8px', padding: '7px 12px',
                minWidth: '220px', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
                <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agreements…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#0f172a', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
              )}
            </div>
          </div>

          {filteredAgreements.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                {agreements.length === 0 ? 'No agreements yet' : 'No results found'}
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                {agreements.length === 0 ? 'Agreements will appear here once created.' : 'Try adjusting your search or filter.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['ID', 'Customer', 'Site', 'Unit', 'Billing', 'Effective from', 'Status', ''].map((h, i) => (
                    <th key={i} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.map((a, i) => {
                  const stat = STATUS[a.status] ?? STATUS.draft;
                  return (
                    <tr
                      key={a.id}
                      className="agr-row"
                      onClick={() => setSelected(a)}
                      style={{
                        animationDelay: `${i * 30}ms`,
                        borderBottom: i < filteredAgreements.length - 1 ? '1px solid #f8fafc' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#94a3b8' }}>{a.id.slice(0, 8)}…</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {a.customerName ?? a.tenantId.slice(0, 10) + '…'}
                        {a.customerEmail && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{a.customerEmail}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>
                        {a.siteName ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>
                        {a.unitCode ?? '—'}
                        {a.unitTypeName && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{a.unitTypeName}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', textTransform: 'capitalize', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.billingCycle.replace('_', ' ')}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`,
                          borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, flexShrink: 0 }} />
                          {stat.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <AgreementActions agreement={a} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{
          background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
          overflow: 'hidden',
        }}>
          {/* Documents toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ flex: 1 }} />
            <div
              className="agr-search-box"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: '8px', padding: '7px 12px',
                minWidth: '220px', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
                <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#0f172a', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
              )}
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                {documents.length === 0 ? 'No documents stored yet' : 'No results found'}
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                {documents.length === 0 ? 'Documents will appear here once created.' : 'Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['Kind', 'Subject', 'Locale', 'Date'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc, i) => {
                  const pill = KIND_PILL[doc.kind] ?? defaultKindPill;
                  return (
                    <tr key={doc.id} className="agr-row" style={{ borderBottom: i < filteredDocuments.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: pill.bg, color: pill.color, border: `1px solid ${pill.border}`,
                          borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
                          {doc.kind}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569', textTransform: 'capitalize', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>{doc.subjectType}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px' }}>{doc.locale ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
