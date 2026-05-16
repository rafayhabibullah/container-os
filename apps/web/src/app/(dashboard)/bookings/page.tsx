import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
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

export default async function BookingsPage() {
  const user = await requireAuth();
  const bookings = await serverFetch<BookingRow[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as BookingRow[]);

  const pending = bookings.filter((b) => b.status === 'pending').length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .booking-row { background: #ffffff; }
        .booking-row:hover { background: #f8fafc; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Bookings
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                  {bookings.length} total
                </span>
                {pending > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                    {pending} pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search toolbar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
                <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search bookings…"
                readOnly
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }}
              />
            </div>
          </div>

          {/* Table / empty state */}
          {bookings.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No bookings yet</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>Bookings will appear here when customers reserve units.</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Booking ID', 'Source', 'Move-in', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, i) => {
                    const stat = STATUS[booking.status] ?? STATUS.expired;
                    const src  = SOURCE[booking.source]  ?? SOURCE.direct;
                    return (
                      <tr
                        key={booking.id}
                        className="booking-row"
                        style={{ borderBottom: i < bookings.length - 1 ? '1px solid #f8fafc' : 'none' }}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                          {booking.id.slice(0, 12)}…
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ background: src.bg, color: src.text, border: `1px solid ${src.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {booking.source}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {new Date(booking.startDate).toLocaleDateString('de-DE')}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block', flexShrink: 0 }} />
                            {stat.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <BookingActions reservationId={booking.id} orgId={user.organisationId} status={booking.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
