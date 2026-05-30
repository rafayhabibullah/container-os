import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }
interface Unit {
  id: string; unitCode: string; kind: string;
  status: string; driveUp: boolean; unitType: UnitType;
}

const UNIT_STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  available:      { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Available'      },
  reserved:       { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Reserved'       },
  occupied:       { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Occupied'       },
  maintenance:    { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Maintenance'    },
  out_of_service: { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Out of service' },
};

export default async function UnitsPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const units = await serverFetch<Unit[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/units`,
  );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .unit-row { background: #ffffff; }
        .unit-row:hover { background: #f8fafc; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <Link href={`/sites/${params.siteId}`} style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '16px' }}>
            ← Site
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Units
              </h1>
              <span style={{ fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {units.length} unit{units.length !== 1 ? 's' : ''}
              </span>
            </div>
            {(user.role === 'owner' || user.role === 'operator') && (
              <Link
                href={`/sites/${params.siteId}/units/new`}
                style={{ background: '#0f172a', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'inline-block' }}
              >
                + Add unit
              </Link>
            )}
          </div>

          {units.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No units yet</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add your first unit to this site.</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {['Code', 'Type', 'Kind', 'Drive-up', 'Status', ''].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit, i) => {
                    const stat = UNIT_STATUS[unit.status] ?? { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: unit.status };
                    return (
                      <tr key={unit.id} className="unit-row" style={{ borderBottom: i < units.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {unit.unitCode}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {unit.unitType?.name ?? '—'}{unit.unitType?.sizeSqm ? ` (${unit.unitType.sizeSqm}m²)` : ''}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
                          {unit.kind.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: unit.driveUp ? '#15803d' : '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {unit.driveUp ? 'Yes' : 'No'}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block', flexShrink: 0 }} />
                            {stat.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <Link href={`/sites/${params.siteId}/units/${unit.id}`} style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Edit →
                          </Link>
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
