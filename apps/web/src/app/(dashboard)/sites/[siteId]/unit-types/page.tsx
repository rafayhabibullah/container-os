import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[]; }

export default async function UnitTypesPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const unitTypes = await serverFetch<UnitType[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`,
  );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .unit-type-row { background: #ffffff; }
        .unit-type-row:hover { background: #f8fafc; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <Link href={`/sites/${params.siteId}`} style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '16px' }}>
            ← Site
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Unit Types
              </h1>
              <span style={{ fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {unitTypes.length} type{unitTypes.length !== 1 ? 's' : ''}
              </span>
            </div>
            {user.role === 'owner' && (
              <Link
                href={`/sites/${params.siteId}/unit-types/new`}
                style={{ background: '#0f172a', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'inline-block' }}
              >
                + Add type
              </Link>
            )}
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            {unitTypes.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No unit types yet</p>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add unit types to start creating units.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Name', 'Size (m²)', 'Volume (m³)', 'Door', 'Features'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unitTypes.map((ut, i) => (
                    <tr key={ut.id} className="unit-type-row" style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeSqm}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeCbm ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.doorType ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.features.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
