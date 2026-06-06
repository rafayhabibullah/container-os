import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import ReservationsTable from './ReservationsTable';

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

export default async function ReservationsPage() {
  const user = await requireAuth();
  const reservations = await serverFetch<Reservation[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as Reservation[]);

  const pending = reservations.filter((r) => r.status === 'pending').length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Reservations
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                  {reservations.length} total
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

          <ReservationsTable reservations={reservations} />
        </div>
      </div>
    </>
  );
}
