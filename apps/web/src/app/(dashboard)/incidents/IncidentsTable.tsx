'use client';

import { useState, useMemo } from 'react';
import IncidentActions from './IncidentActions';

interface Incident {
  id: string;
  type: string;
  status: string;
  severity: string;
  siteId: string;
  createdAt: string;
}

const SEV: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  critical: { dot: '#dc2626', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
  high:     { dot: '#ea580c', text: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'High'     },
  medium:   { dot: '#ca8a04', text: '#92400e', bg: '#fefce8', border: '#fde68a', label: 'Medium'   },
  low:      { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low'      },
};

const STAT: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  open:          { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Open'          },
  investigating: { dot: '#8b5cf6', text: '#6d28d9', bg: '#faf5ff', border: '#ddd6fe', label: 'Investigating'  },
  resolved:      { dot: '#94a3b8', text: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Resolved'       },
};

const FILTERS = [
  { key: 'all',          label: 'All'           },
  { key: 'open',         label: 'Open'          },
  { key: 'investigating',label: 'Investigating' },
  { key: 'resolved',     label: 'Resolved'      },
] as const;

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
}

export default function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() =>
    incidents.filter((inc) => {
      const q      = query.trim().toLowerCase();
      const matchQ = !q || inc.type.toLowerCase().includes(q) || inc.siteId.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || inc.status === statusFilter;
      return matchQ && matchS;
    }),
    [incidents, query, statusFilter],
  );

  return (
    <>
      <style>{`
        @keyframes row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .inc-row { animation: row-in 0.25s ease both; }
        .inc-row:hover { background: #f8fafc !important; }
        .filter-tab { transition: all 0.15s ease; }
        .filter-tab:hover { color: #0f172a !important; }
        .action-ghost { transition: all 0.12s ease; }
        .action-ghost:hover { background: #f1f5f9 !important; color: #0f172a !important; }
        .search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      {/* White card container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap',
        }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {FILTERS.map((f) => {
              const active = statusFilter === f.key;
              const count  = f.key === 'all' ? incidents.length : incidents.filter((i) => i.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="filter-tab"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? '#f1f5f9' : 'transparent',
                    color: active ? '#0f172a' : '#94a3b8',
                    fontSize: '13px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {f.label}
                  <span style={{
                    background: active ? '#e2e8f0' : '#f8fafc',
                    color: active ? '#475569' : '#cbd5e1',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    minWidth: '20px',
                    textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div
            className="search-box"
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
              placeholder="Search incidents…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#0f172a', fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', lineHeight: 1, padding: '1px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: '#f1f5f9', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 12px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {incidents.length === 0 ? 'No incidents reported' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {incidents.length === 0 ? 'When incidents are reported, they will appear here.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Severity', 'Incident', 'Site', 'Status', 'Reported', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: '11px',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      color: '#94a3b8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc, i) => {
                const sev  = SEV[inc.severity]  ?? SEV.low;
                const stat = STAT[inc.status]   ?? STAT.resolved;
                return (
                  <tr
                    key={inc.id}
                    className="inc-row"
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                      cursor: 'default',
                    }}
                  >
                    {/* Severity */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: sev.bg, color: sev.text,
                        border: `1px solid ${sev.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: sev.dot, flexShrink: 0, display: 'inline-block',
                        }} />
                        {sev.label}
                      </span>
                    </td>

                    {/* Incident type */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '14px', fontWeight: 600, color: '#0f172a',
                      }}>
                        {inc.type}
                      </span>
                    </td>

                    {/* Site */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', color: '#64748b',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '5px', padding: '2px 8px',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {inc.siteId.slice(0, 8)}…
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: stat.bg, color: stat.text,
                        border: `1px solid ${stat.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: stat.dot, flexShrink: 0, display: 'inline-block',
                        }} />
                        {stat.label}
                      </span>
                    </td>

                    {/* Time */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', color: '#94a3b8',
                      }}>
                        {timeAgo(inc.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {inc.status !== 'resolved' && (
                        <IncidentActions type="update" incidentId={inc.id} currentStatus={inc.status} />
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
