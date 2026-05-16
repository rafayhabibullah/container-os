'use client';

import { useState, useMemo } from 'react';
import { BookingActions } from './BookingActions';

interface BookingRow {
  id: string;
  status: string;
  source: string;
  startDate: string;
  expiresAt: string;
  createdAt: string;
  customerId: string;
}

interface Props {
  bookings: BookingRow[];
  orgId: string;
}

const STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  pending:           { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Pending'           },
  pending_signature: { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: 'Pending signature' },
  confirmed:         { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Confirmed'         },
  expired:           { dot: '#cbd5e1', text: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Expired'           },
  cancelled:         { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Cancelled'         },
  converted:         { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Converted'         },
};

const SOURCE: Record<string, { text: string; bg: string; border: string }> = {
  marketplace: { text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  direct:      { text: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

const FILTERS = [
  { key: 'all',               label: 'All'               },
  { key: 'pending',           label: 'Pending'           },
  { key: 'confirmed',         label: 'Confirmed'         },
  { key: 'pending_signature', label: 'Pending signature' },
  { key: 'cancelled',         label: 'Cancelled'         },
  { key: 'expired',           label: 'Expired'           },
] as const;

export function BookingsTable({ bookings, orgId }: Props) {
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() =>
    bookings.filter((b) => {
      const q      = query.trim().toLowerCase();
      const matchQ = !q || b.id.toLowerCase().includes(q) || b.source.toLowerCase().includes(q) || b.customerId.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || b.status === statusFilter;
      return matchQ && matchS;
    }),
    [bookings, query, statusFilter],
  );

  return (
    <>
      <style>{`
        @keyframes booking-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .booking-row { animation: booking-row-in 0.25s ease both; }
        .booking-row:hover { background: #f8fafc !important; }
        .booking-filter-btn { transition: all 0.12s ease; }
        .booking-filter-btn:hover { color: #0f172a !important; }
        .booking-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
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
              const count  = f.key === 'all' ? bookings.length : bookings.filter((b) => b.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="booking-filter-btn"
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
            className="booking-search-box"
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
              placeholder="Search bookings…"
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
              {bookings.length === 0 ? 'No bookings yet' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {bookings.length === 0 ? 'Bookings will appear here when customers reserve units.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Booking ID', 'Source', 'Move-in', 'Status', ''].map((h) => (
                  <th key={h} style={{
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
              {filtered.map((booking, i) => {
                const stat = STATUS[booking.status] ?? STATUS.expired;
                const src  = SOURCE[booking.source]  ?? SOURCE.direct;
                return (
                  <tr
                    key={booking.id}
                    className="booking-row"
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                      {booking.id.slice(0, 12)}…
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: src.bg, color: src.text, border: `1px solid ${src.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        {booking.source}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {new Date(booking.startDate).toLocaleDateString('de-DE')}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block', flexShrink: 0 }} />
                        {stat.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <BookingActions reservationId={booking.id} orgId={orgId} status={booking.status} />
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
