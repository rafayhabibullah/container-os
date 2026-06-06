'use client';

import { useState, useMemo } from 'react';
import ReservationActions from './ReservationActions';
import ReservationDrawer from './ReservationDrawer';

interface Reservation {
  id: string;
  siteId: string;
  unitId: string;
  unitTypeId: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  siteName: string | null;
  unitTypeName: string | null;
  unitCode: string | null;
  status: 'pending' | 'pending_signature' | 'confirmed' | 'expired' | 'cancelled' | 'converted';
  source: string;
  startDate: string;
  expiresAt: string;
  createdAt: string;
}

interface Props {
  reservations: Reservation[];
}

const STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  pending:           { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Pending'           },
  pending_signature: { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Pending signature' },
  confirmed:         { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Confirmed'         },
  converted:         { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Converted'         },
  cancelled:         { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Cancelled'         },
  expired:           { dot: '#cbd5e1', text: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Expired'           },
};

const FILTERS = [
  { key: 'all',               label: 'All'               },
  { key: 'pending',           label: 'Pending'           },
  { key: 'pending_signature', label: 'Pending signature' },
  { key: 'confirmed',         label: 'Confirmed'         },
  { key: 'converted',         label: 'Converted'         },
  { key: 'cancelled',         label: 'Cancelled'         },
  { key: 'expired',           label: 'Expired'           },
] as const;

export default function ReservationsTable({ reservations }: Props) {
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected,     setSelected]     = useState<Reservation | null>(null);

  const filtered = useMemo(() =>
    reservations.filter((r) => {
      const q      = query.trim().toLowerCase();
      const matchQ = !q || r.id.toLowerCase().includes(q) || (r.customerName ?? r.customerId).toLowerCase().includes(q) || (r.customerEmail ?? '').toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || r.status === statusFilter;
      return matchQ && matchS;
    }),
    [reservations, query, statusFilter],
  );

  return (
    <>
      {selected && <ReservationDrawer reservation={selected} onClose={() => setSelected(null)} />}
      <style>{`
        @keyframes reservation-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reservation-row { animation: reservation-row-in 0.25s ease both; }
        .reservation-row:hover { background: #f8fafc !important; }
        .reservation-filter-btn { transition: all 0.12s ease; }
        .reservation-filter-btn:hover { color: #0f172a !important; }
        .reservation-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
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
          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
            {FILTERS.map((f) => {
              const active = statusFilter === f.key;
              const count  = f.key === 'all' ? reservations.length : reservations.filter((r) => r.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="reservation-filter-btn"
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
            className="reservation-search-box"
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
              placeholder="Search reservations…"
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
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {reservations.length === 0 ? 'No reservations yet' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {reservations.length === 0 ? 'Reservations will appear here once customers make bookings.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['ID', 'Customer', 'Site', 'Unit', 'Move-in', 'Expires', 'Status', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left', padding: '10px 16px',
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
              {filtered.map((r, i) => {
                const stat = STATUS[r.status] ?? STATUS.expired;
                return (
                  <tr
                    key={r.id}
                    className="reservation-row"
                    onClick={() => setSelected(r)}
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                      {r.id.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {r.customerName ?? r.customerId.slice(0, 10) + '…'}
                      {r.customerEmail && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{r.customerEmail}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      {r.siteName ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap' }}>
                      {r.unitCode ?? '—'}
                      {r.unitTypeName && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{r.unitTypeName}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {new Date(r.startDate).toLocaleDateString('de-DE')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {new Date(r.expiresAt).toLocaleDateString('de-DE')}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, flexShrink: 0 }} />
                        {stat.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <ReservationActions reservation={r} />
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
