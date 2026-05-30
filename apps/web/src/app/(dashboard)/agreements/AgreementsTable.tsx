'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AgreementDrawer from './AgreementDrawer';

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
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Agreement | null>(null);

  const filteredAgreements = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agreements;
    return agreements.filter((a) =>
      a.id.toLowerCase().includes(q) || a.tenantId.toLowerCase().includes(q) || a.status.includes(q),
    );
  }, [agreements, query]);

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
        .agr-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#e2e8f0', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setQuery(''); router.push(`/agreements?tab=${t.id}`); }}
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

      {/* Search */}
      <div
        className="agr-search-box"
        style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '16px', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
          <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tab}…`}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: '14px', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
        )}
      </div>

      {tab === 'agreements' ? (
        filteredAgreements.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {agreements.length === 0 ? 'No agreements yet' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {agreements.length === 0 ? 'Agreements will appear here once created.' : 'Try adjusting your search.'}
            </p>
          </div>
        ) : (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {['ID', 'Customer', 'Billing', 'Effective from', 'Status'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
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
                      <td style={{ padding: '12px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#94a3b8' }}>{a.id.slice(0, 12)}…</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#475569' }}>{a.tenantId.slice(0, 10)}…</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', textTransform: 'capitalize', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.billingCycle.replace('_', ' ')}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        filteredDocuments.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {documents.length === 0 ? 'No documents stored yet' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {documents.length === 0 ? 'Documents will appear here once created.' : 'Try adjusting your search.'}
            </p>
          </div>
        ) : (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
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
          </div>
        )
      )}
    </>
  );
}
