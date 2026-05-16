import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import ListingsTable from './ListingsTable';

interface ListingRow {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'paused' | 'fully_booked' | 'archived';
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  publicPriceMinor: number | null;
  showPrice: boolean;
  site: { name: string };
  unit: { unitCode: string };
  createdAt: string;
}

export default async function ListingsPage() {
  const user = await requireAuth();
  const listings = await serverFetch<ListingRow[]>(
    `/v1/organisations/${user.organisationId}/listings`,
  ).catch(() => [] as ListingRow[]);

  const published   = listings.filter((l) => l.status === 'published').length;
  const draft       = listings.filter((l) => l.status === 'draft').length;
  const paused      = listings.filter((l) => l.status === 'paused').length;
  const fullyBooked = listings.filter((l) => l.status === 'fully_booked').length;
  const archived    = listings.filter((l) => l.status === 'archived').length;

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
                Marketplace Listings
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {published > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                    {published} published
                  </span>
                )}
                {draft > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {draft} draft
                  </span>
                )}
                {paused > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {paused} paused
                  </span>
                )}
                {fullyBooked > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {fullyBooked} fully booked
                  </span>
                )}
                {archived > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {archived} archived
                  </span>
                )}
                {listings.length === 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    No listings yet
                  </span>
                )}
              </div>
            </div>

            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: '#0f172a', color: '#ffffff',
                padding: '10px 18px', borderRadius: '8px', border: 'none',
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700, fontSize: '13px',
                boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              New listing
            </button>
          </div>

          <ListingsTable listings={listings} orgId={user.organisationId} />
        </div>
      </div>
    </>
  );
}
