import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';

interface OccupancyItem { siteId: string; siteName: string; occupancyPct: number; totalUnits: number; occupiedUnits: number; }
interface RevenueItem { siteId: string; totalMinor: number; currency: string; }

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
  overflow: 'hidden',
};

export default async function ReportsPage() {
  const user = await requireAuth();
  const orgId = user.organisationId;

  const [occupancy, revenue] = await Promise.all([
    serverFetch<OccupancyItem[]>(`/v1/organisations/${orgId}/reports/occupancy`).catch(() => []),
    serverFetch<RevenueItem[]>(`/v1/organisations/${orgId}/reports/revenue`).catch(() => []),
  ]);

  const totalRevenue = revenue.reduce((sum, r) => sum + r.totalMinor, 0);
  const avgOccupancy = occupancy.length > 0
    ? Math.round(occupancy.reduce((sum, o) => sum + o.occupancyPct, 0) / occupancy.length)
    : 0;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Reports
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '32px' }}>
            Overview of your organisation's performance
          </p>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{ ...cardStyle, padding: '20px 24px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Avg Occupancy
              </p>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{avgOccupancy}%</p>
            </div>
            <div style={{ ...cardStyle, padding: '20px 24px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Revenue (this month)
              </p>
              <p style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0 }}>€{(totalRevenue / 100).toFixed(2)}</p>
            </div>
          </div>

          {/* Occupancy by site table */}
          <div style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Occupancy by site</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={thStyle}>Site</th>
                  <th style={thStyle}>Occupancy</th>
                  <th style={thStyle}>Units</th>
                </tr>
              </thead>
              <tbody>
                {occupancy.map((o) => (
                  <tr key={o.siteId} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>
                      {o.siteName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', width: '100px', flexShrink: 0 }}>
                          <div style={{ background: '#0f172a', height: '6px', borderRadius: '3px', width: `${o.occupancyPct}%` }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{o.occupancyPct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{o.occupiedUnits} / {o.totalUnits}</td>
                  </tr>
                ))}
                {occupancy.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '64px 24px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No data yet</p>
                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Occupancy data will appear here once sites are active.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
