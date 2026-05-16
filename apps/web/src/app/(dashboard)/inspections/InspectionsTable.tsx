'use client';

import { useState, useMemo } from 'react';

interface ChecklistItem { code: string; label: string; result: string; note?: string; }

interface InspectionRow {
  id: string;
  siteId: string | null;
  unitId: string;
  kind: string;
  result: string | null;
  checklist: ChecklistItem[] | null;
  notes: string | null;
  depositDeduction: number | null;
  completedAt: string | null;
  createdAt: string;
}

const RESULT: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  pass: { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Pass'        },
  fail: { dot: '#dc2626', text: '#b91c1c', bg: '#fef2f2', border: '#fecaca', label: 'Fail'        },
  none: { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'In progress' },
};

const KIND_LABEL: Record<string, string> = {
  move_in:  'Move in',
  move_out: 'Move out',
  routine:  'Routine',
};

const FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'pass',        label: 'Pass'        },
  { key: 'fail',        label: 'Fail'        },
  { key: 'in_progress', label: 'In progress' },
] as const;

export default function InspectionsTable({ inspections, onContinue }: { inspections: InspectionRow[]; onContinue: (inspection: InspectionRow) => void }) {
  const [query,        setQuery]        = useState('');
  const [resultFilter, setResultFilter] = useState<string>('all');

  const filtered = useMemo(() =>
    inspections.filter((insp) => {
      const q      = query.trim().toLowerCase();
      const matchQ = !q || insp.unitId.toLowerCase().includes(q) || (insp.siteId ?? '').toLowerCase().includes(q);
      const matchR = resultFilter === 'all'
        || (resultFilter === 'in_progress' && !insp.result)
        || insp.result === resultFilter;
      return matchQ && matchR;
    }),
    [inspections, query, resultFilter],
  );

  function filterCount(key: string) {
    if (key === 'all') return inspections.length;
    if (key === 'in_progress') return inspections.filter((i) => !i.result).length;
    return inspections.filter((i) => i.result === key).length;
  }

  return (
    <>
      <style>{`
        @keyframes insp-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .insp-row { animation: insp-row-in 0.25s ease both; }
        .insp-row:hover { background: #f8fafc !important; }
        .insp-filter-btn { transition: all 0.12s ease; }
        .insp-filter-btn:hover { color: #0f172a !important; }
        .insp-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {FILTERS.map((f) => {
              const active = resultFilter === f.key;
              const count  = filterCount(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() => setResultFilter(f.key)}
                  className="insp-filter-btn"
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

          {/* Search */}
          <div
            className="insp-search-box"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '7px 12px',
              minWidth: '220px', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search inspections…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#0f172a', fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {inspections.length === 0 ? 'No inspections recorded' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {inspections.length === 0 ? 'Start a new inspection to track unit conditions.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Site', 'Unit', 'Kind', 'Result', 'Checklist', 'Deposit', 'Completed', 'Created', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 20px',
                    fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700, color: '#94a3b8',
                    letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((insp, i) => {
                const res = RESULT[insp.result ?? 'none'];
                return (
                  <tr
                    key={insp.id}
                    className="insp-row"
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    {/* Site */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '2px 8px' }}>
                        {insp.siteId ? insp.siteId.slice(0, 8) + '…' : '—'}
                      </span>
                    </td>

                    {/* Unit */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '2px 8px' }}>
                        {insp.unitId.slice(0, 8)}…
                      </span>
                    </td>

                    {/* Kind */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {KIND_LABEL[insp.kind] ?? insp.kind}
                      </span>
                    </td>

                    {/* Result */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: res.bg, color: res.text,
                        border: `1px solid ${res.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: res.dot, display: 'inline-block' }} />
                        {res.label}
                      </span>
                    </td>

                    {/* Checklist summary */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      {insp.checklist && insp.checklist.length > 0 ? (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#64748b' }}>
                          {insp.checklist.filter((i) => i.result === 'pass').length}✓{' '}
                          {insp.checklist.filter((i) => i.result === 'fail').length > 0 && (
                            <span style={{ color: '#dc2626' }}>{insp.checklist.filter((i) => i.result === 'fail').length}✗</span>
                          )}
                          {' '}/ {insp.checklist.length}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>
                      )}
                    </td>

                    {/* Deposit deduction */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      {insp.depositDeduction ? (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                          €{insp.depositDeduction.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>—</span>
                      )}
                    </td>

                    {/* Completed */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8' }}>
                        {insp.completedAt ? new Date(insp.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </td>

                    {/* Created */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8' }}>
                        {new Date(insp.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>

                    {/* Continue action */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      {!insp.result && (
                        <button
                          onClick={() => onContinue(insp)}
                          style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0369a1',
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            padding: '4px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          Continue
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
