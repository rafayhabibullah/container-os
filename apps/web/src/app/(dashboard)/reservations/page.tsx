import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import ReservationActions from './ReservationActions';

interface Reservation {
  id: string;
  siteId: string;
  unitId: string;
  unitTypeId: string;
  customerId: string;
  status: 'pending' | 'pending_signature' | 'confirmed' | 'expired' | 'cancelled' | 'converted';
  startDate: string;
  expiresAt: string;
  createdAt: string;
}

type StatusKey = 'pending' | 'pending_signature' | 'confirmed' | 'expired' | 'cancelled' | 'converted';

const STATUS_PILL: Record<StatusKey, { dot: string; color: string; bg: string; border: string }> = {
  pending:           { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  pending_signature: { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  confirmed:         { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  converted:         { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  cancelled:         { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  expired:           { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

function StatusPill({ status }: { status: string }) {
  const pill = STATUS_PILL[status as StatusKey] ?? STATUS_PILL.expired;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      borderRadius: '20px',
      padding: '3px 10px',
      fontSize: '12px',
      fontWeight: 600,
      color: pill.color,
      background: pill.bg,
      border: `1px solid ${pill.border}`,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
      {status.replace('_', ' ')}
    </span>
  );
}

export default async function ReservationsPage() {
  const user = await requireAuth();
  const reservations = await serverFetch<Reservation[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as Reservation[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Reservations
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Search bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Search…" readOnly style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }} />
          </div>

          {/* Table / empty state */}
          {reservations.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>No reservations yet.</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Move-in</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Expires</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '10px 16px' }} />
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                        {r.id.slice(0, 12)}…
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                        {r.customerId.slice(0, 10)}…
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {new Date(r.startDate).toLocaleDateString('de-DE')}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {new Date(r.expiresAt).toLocaleDateString('de-DE')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusPill status={r.status} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <ReservationActions reservation={r} />
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
