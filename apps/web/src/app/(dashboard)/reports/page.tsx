import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import ReportsTabs from './ReportsTabs';

interface UnitTypeBreakdown { unitTypeId: string; unitTypeName: string; sizeSqm: number; totalUnits: number; occupiedUnits: number; occupancyPct: number; }
interface OccupancyItem { siteId: string; siteName: string; occupancyPct: number; totalUnits: number; occupiedUnits: number; byUnitType: UnitTypeBreakdown[]; }
interface RevenueReport {
  sites: { siteId: string; totalMinor: number; currency: string }[];
  byMonth: { month: string; totalMinor: number }[];
  byPaymentMethod: { method: string; totalMinor: number }[];
}
interface DelinquencyItem { customerId: string; buckets: Record<string, number>; total: number; }
interface ChurnReport { count: number; agreements: { agreementId: string; tenantId: string; unitId: string; siteId: string; terminatedAt: string; reason: string | null }[]; }
interface LeadConversionReport {
  total: number; converted: number; conversionRatePct: number;
  byStatus: { status: string; count: number }[];
  bySource: { source: string; total: number; converted: number; conversionRatePct: number }[];
}
interface MandateStatusItem { status: string; scheme: string; count: number; }
interface InspectionsReport { total: number; passed: number; failed: number; failedChecklistItems: number; tasksCreated: number; }
interface OperationsReport {
  tasksByPriority: { priority: string; status: string; count: number }[];
  tasksByType: { type: string | null; status: string; count: number }[];
  incidentsByStatus: { status: string; severity: string; count: number }[];
}
interface PaymentsReportItem { status: string; provider: string; count: number; totalMinor: number; }

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

const tdStyle: React.CSSProperties = { padding: '12px 16px', color: '#475569' };

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
  overflow: 'hidden',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...cardStyle, marginBottom: '20px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function euro(minor: number) {
  return `€${(minor / 100).toFixed(2)}`;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireAuth();
  const orgId = user.organisationId;
  const { from, to } = await searchParams;
  const qs = from && to ? `?from=${from}&to=${to}` : '';

  const [
    occupancy,
    revenue,
    delinquency,
    churn,
    leadConversion,
    mandateStatus,
    inspections,
    operations,
    payments,
  ] = await Promise.all([
    serverFetch<OccupancyItem[]>(`/v1/organisations/${orgId}/reports/occupancy`).catch(() => []),
    serverFetch<RevenueReport>(`/v1/organisations/${orgId}/reports/revenue${qs}`).catch(() => ({ sites: [], byMonth: [], byPaymentMethod: [] })),
    serverFetch<DelinquencyItem[]>(`/v1/organisations/${orgId}/reports/delinquency${qs}`).catch(() => []),
    serverFetch<ChurnReport>(`/v1/organisations/${orgId}/reports/churn${qs}`).catch(() => ({ count: 0, agreements: [] })),
    serverFetch<LeadConversionReport>(`/v1/organisations/${orgId}/reports/lead-conversion${qs}`).catch(() => ({ total: 0, converted: 0, conversionRatePct: 0, byStatus: [], bySource: [] })),
    serverFetch<MandateStatusItem[]>(`/v1/organisations/${orgId}/reports/mandate-status`).catch(() => []),
    serverFetch<InspectionsReport>(`/v1/organisations/${orgId}/reports/inspections${qs}`).catch(() => ({ total: 0, passed: 0, failed: 0, failedChecklistItems: 0, tasksCreated: 0 })),
    serverFetch<OperationsReport>(`/v1/organisations/${orgId}/reports/operations${qs}`).catch(() => ({ tasksByPriority: [], tasksByType: [], incidentsByStatus: [] })),
    serverFetch<PaymentsReportItem[]>(`/v1/organisations/${orgId}/reports/payments${qs}`).catch(() => []),
  ]);

  const totalRevenue = revenue.sites.reduce((sum, r) => sum + r.totalMinor, 0);
  const avgOccupancy = occupancy.length > 0
    ? Math.round(occupancy.reduce((sum, o) => sum + o.occupancyPct, 0) / occupancy.length)
    : 0;
  const t = await getT();

  const overview = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ ...cardStyle, padding: '20px 24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            {t('dashboard.reports.avgOccupancy')}
          </p>
          <p style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{avgOccupancy}%</p>
        </div>
        <div style={{ ...cardStyle, padding: '20px 24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            {t('dashboard.reports.revenueThisMonth')}
          </p>
          <p style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{euro(totalRevenue)}</p>
        </div>
      </div>

      <Section title={t('dashboard.reports.occupancyBySite')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.site')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.occupancy')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.units')}</th>
            </tr>
          </thead>
          <tbody>
            {occupancy.map((o) => (
              <tr key={o.siteId} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{o.siteName}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ background: '#e2e8f0', height: '6px', borderRadius: '3px', width: '100px', flexShrink: 0 }}>
                      <div style={{ background: '#0f172a', height: '6px', borderRadius: '3px', width: `${o.occupancyPct}%` }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{o.occupancyPct}%</span>
                  </div>
                </td>
                <td style={tdStyle}>{o.occupiedUnits} / {o.totalUnits}</td>
              </tr>
            ))}
            {occupancy.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '64px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>{t('dashboard.reports.empty.title')}</p>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t('dashboard.reports.empty.hint')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>
    </>
  );

  const financial = (
    <>
      <Section title={t('dashboard.reports.revenueByMonth')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.month')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {revenue.byMonth.map((m) => (
              <tr key={m.month} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{m.month}</td>
                <td style={tdStyle}>{euro(m.totalMinor)}</td>
              </tr>
            ))}
            {revenue.byMonth.length === 0 && (
              <tr><td colSpan={2} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title={t('dashboard.reports.revenueByMethod')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.method')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {revenue.byPaymentMethod.map((m) => (
              <tr key={m.method} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{m.method}</td>
                <td style={tdStyle}>{euro(m.totalMinor)}</td>
              </tr>
            ))}
            {revenue.byPaymentMethod.length === 0 && (
              <tr><td colSpan={2} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title={t('dashboard.reports.delinquency')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.customer')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.bucket0_30')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.bucket31_60')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.bucket61_90')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.bucket90plus')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.total')}</th>
            </tr>
          </thead>
          <tbody>
            {delinquency.map((d) => (
              <tr key={d.customerId} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{d.customerId}</td>
                <td style={tdStyle}>{euro(d.buckets['0-30'] ?? 0)}</td>
                <td style={tdStyle}>{euro(d.buckets['31-60'] ?? 0)}</td>
                <td style={tdStyle}>{euro(d.buckets['61-90'] ?? 0)}</td>
                <td style={tdStyle}>{euro(d.buckets['90+'] ?? 0)}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#0f172a' }}>{euro(d.total)}</td>
              </tr>
            ))}
            {delinquency.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title={t('dashboard.reports.mandateStatus')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.status')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.scheme')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.count')}</th>
            </tr>
          </thead>
          <tbody>
            {mandateStatus.map((m, i) => (
              <tr key={i} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{m.status}</td>
                <td style={tdStyle}>{m.scheme}</td>
                <td style={tdStyle}>{m.count}</td>
              </tr>
            ))}
            {mandateStatus.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title={t('dashboard.reports.payments')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.status')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.provider')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.count')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.amount')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={i} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{p.status}</td>
                <td style={tdStyle}>{p.provider}</td>
                <td style={tdStyle}>{p.count}</td>
                <td style={tdStyle}>{euro(p.totalMinor)}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>
    </>
  );

  const operationsTab = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          [t('dashboard.reports.table.passed'), inspections.passed],
          [t('dashboard.reports.table.failed'), inspections.failed],
          [t('dashboard.reports.table.failedItems'), inspections.failedChecklistItems],
          [t('dashboard.reports.table.tasksCreated'), inspections.tasksCreated],
        ].map(([label, value]) => (
          <div key={label as string} style={{ ...cardStyle, padding: '16px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <Section title={t('dashboard.reports.operations')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.priority')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.status')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.count')}</th>
            </tr>
          </thead>
          <tbody>
            {operations.tasksByPriority.map((row, i) => (
              <tr key={i} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{row.priority}</td>
                <td style={tdStyle}>{row.status}</td>
                <td style={tdStyle}>{row.count}</td>
              </tr>
            ))}
            {operations.tasksByPriority.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title={t('dashboard.reports.table.severity')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.status')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.severity')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.count')}</th>
            </tr>
          </thead>
          <tbody>
            {operations.incidentsByStatus.map((row, i) => (
              <tr key={i} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{row.status}</td>
                <td style={tdStyle}>{row.severity}</td>
                <td style={tdStyle}>{row.count}</td>
              </tr>
            ))}
            {operations.incidentsByStatus.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>
    </>
  );

  const growth = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          [t('dashboard.reports.table.total_'), leadConversion.total],
          [t('dashboard.reports.table.converted'), leadConversion.converted],
          [t('dashboard.reports.table.rate'), `${leadConversion.conversionRatePct}%`],
        ].map(([label, value]) => (
          <div key={label as string} style={{ ...cardStyle, padding: '16px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</p>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <Section title={t('dashboard.reports.leadConversion')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.source')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.total_')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.converted')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.rate')}</th>
            </tr>
          </thead>
          <tbody>
            {leadConversion.bySource.map((row, i) => (
              <tr key={i} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{row.source}</td>
                <td style={tdStyle}>{row.total}</td>
                <td style={tdStyle}>{row.converted}</td>
                <td style={tdStyle}>{row.conversionRatePct}%</td>
              </tr>
            ))}
            {leadConversion.bySource.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title={t('dashboard.reports.churn')}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <th style={thStyle}>{t('dashboard.reports.table.tenant')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.unit')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.terminatedAt')}</th>
              <th style={thStyle}>{t('dashboard.reports.table.reason')}</th>
            </tr>
          </thead>
          <tbody>
            {churn.agreements.map((a) => (
              <tr key={a.agreementId} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{a.tenantId}</td>
                <td style={tdStyle}>{a.unitId}</td>
                <td style={tdStyle}>{new Date(a.terminatedAt).toLocaleDateString('de-DE')}</td>
                <td style={tdStyle}>{a.reason ?? '—'}</td>
              </tr>
            ))}
            {churn.agreements.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>{t('dashboard.reports.empty.title')}</td></tr>
            )}
          </tbody>
        </table>
      </Section>
    </>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {t('dashboard.reports.title')}
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
            {t('dashboard.reports.subtitle')}
          </p>

          <form method="get" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{t('dashboard.reports.dateRange.from')}</label>
              <input type="date" name="from" defaultValue={from ?? ''} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>{t('dashboard.reports.dateRange.to')}</label>
              <input type="date" name="to" defaultValue={to ?? ''} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }} />
            </div>
            <button type="submit" style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {t('dashboard.reports.dateRange.apply')}
            </button>
          </form>

          <ReportsTabs
            labels={{
              overview: t('dashboard.reports.tabs.overview'),
              financial: t('dashboard.reports.tabs.financial'),
              operations: t('dashboard.reports.tabs.operations'),
              growth: t('dashboard.reports.tabs.growth'),
            }}
            overview={overview}
            financial={financial}
            operations={operationsTab}
            growth={growth}
          />
        </div>
      </div>
    </>
  );
}
