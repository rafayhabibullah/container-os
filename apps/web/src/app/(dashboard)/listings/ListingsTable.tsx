'use client';

import { useState, useMemo } from 'react';
import { ListingActions } from './ListingActions';

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'paused' | 'fully_booked' | 'archived';
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  publicPriceMinor: number | null;
  showPrice: boolean;
  site: { name: string };
  unit: { unitCode: string };
  createdAt: string;
}

interface Props {
  listings: ListingRow[];
  orgId: string;
}

const STAT: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  draft:        { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: 'Draft'        },
  published:    { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Published'    },
  paused:       { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Paused'       },
  fully_booked: { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Fully booked' },
  archived:     { dot: '#cbd5e1', text: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Archived'     },
};

const BOOKING_MODE_LABEL: Record<string, string> = {
  approval_required: 'Approval',
  instant_booking:   'Instant',
  request_price:     'Quote',
};

const FILTERS = [
  { key: 'all',          label: 'All'          },
  { key: 'published',    label: 'Published'    },
  { key: 'draft',        label: 'Draft'        },
  { key: 'paused',       label: 'Paused'       },
  { key: 'fully_booked', label: 'Fully booked' },
  { key: 'archived',     label: 'Archived'     },
] as const;

export default function ListingsTable({ listings, orgId }: Props) {
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() =>
    listings.filter((l) => {
      const q      = query.trim().toLowerCase();
      const matchQ = !q || l.title.toLowerCase().includes(q) || l.site.name.toLowerCase().includes(q) || l.unit.unitCode.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || l.status === statusFilter;
      return matchQ && matchS;
    }),
    [listings, query, statusFilter],
  );

  return (
    <>
      <style>{`
        @keyframes listing-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .listing-row { animation: listing-row-in 0.25s ease both; }
        .listing-row:hover { background: #f8fafc !important; }
        .listing-filter-btn { transition: all 0.12s ease; }
        .listing-filter-btn:hover { color: #0f172a !important; }
        .listing-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
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
          <div style={{ display: 'flex', gap: '2px' }}>
            {FILTERS.map((f) => {
              const active = statusFilter === f.key;
              const count  = f.key === 'all' ? listings.length : listings.filter((l) => l.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="listing-filter-btn"
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
            className="listing-search-box"
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
              placeholder="Search listings…"
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
                <path d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {listings.length === 0 ? 'No listings yet' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {listings.length === 0 ? 'Create your first listing to publish units to the marketplace.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Title', 'Site', 'Unit', 'Mode', 'Price', 'Status', ''].map((h, i) => (
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
              {filtered.map((listing, i) => {
                const stat = STAT[listing.status] ?? STAT.draft;
                return (
                  <tr
                    key={listing.id}
                    className="listing-row"
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    {/* Title */}
                    <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {listing.title}
                      </span>
                    </td>

                    {/* Site */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', color: '#64748b',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '5px', padding: '2px 8px', whiteSpace: 'nowrap',
                      }}>
                        {listing.site.name}
                      </span>
                    </td>

                    {/* Unit */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '12px', color: '#475569',
                        background: '#f1f5f9', border: '1px solid #e2e8f0',
                        borderRadius: '5px', padding: '2px 8px',
                      }}>
                        {listing.unit.unitCode}
                      </span>
                    </td>

                    {/* Booking mode */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#64748b' }}>
                        {BOOKING_MODE_LABEL[listing.bookingMode] ?? listing.bookingMode}
                      </span>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {listing.showPrice && listing.publicPriceMinor != null ? (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(listing.publicPriceMinor / 100)}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>Hidden</span>
                      )}
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
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block' }} />
                        {stat.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <ListingActions
                        listingId={listing.id}
                        orgId={orgId}
                        status={listing.status}
                        title={listing.title}
                        description={listing.description}
                        bookingMode={listing.bookingMode}
                        publicPriceMinor={listing.publicPriceMinor}
                        showPrice={listing.showPrice}
                      />
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
