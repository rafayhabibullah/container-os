import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import IncidentActions from './IncidentActions';
import IncidentsTable from './IncidentsTable';

interface Incident {
  id: string;
  type: string;
  status: string;
  severity: string;
  siteId: string;
  unitId: string | null;
  unit: { unitCode: string } | null;
  tenant: { personOrOrgData: Record<string, string>; contacts: { email: string }[] } | null;
  createdAt: string;
}

interface Site {
  id: string;
  name: string;
}

export default async function IncidentsPage() {
  const user = await requireAuth();
  const t = getT();
  const [incidents, sites] = await Promise.all([
    serverFetch<Incident[]>(`/v1/organisations/${user.organisationId}/incidents`).catch(() => [] as Incident[]),
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => [] as Site[]),
  ]);

  const open       = incidents.filter((i) => i.status === 'open').length;
  const critical   = incidents.filter((i) => i.severity === 'critical').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        padding: '36px 40px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* ── Page header ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '28px',
            gap: '20px',
            flexWrap: 'wrap',
          }}>
            <div>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '26px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 10px',
                letterSpacing: '-0.02em',
              }}>
                {t('dashboard.incidents.title')}
              </h1>

              {/* Stat chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {critical > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '12px', fontWeight: 600,
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    {t('dashboard.incidents.critical', { count: String(critical) })}
                  </span>
                )}
                {open > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: '#fff7ed', color: '#ea580c',
                    border: '1px solid #fed7aa',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '12px', fontWeight: 600,
                  }}>
                    {t('dashboard.incidents.open', { count: String(open) })}
                  </span>
                )}
                {resolvedCount > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: '#f0fdf4', color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '12px', fontWeight: 600,
                  }}>
                    {t('dashboard.incidents.resolved', { count: String(resolvedCount) })}
                  </span>
                )}
                {incidents.length === 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: '#f0fdf4', color: '#16a34a',
                    border: '1px solid #bbf7d0',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '12px', fontWeight: 600,
                  }}>
                    {t('dashboard.incidents.allClear')}
                  </span>
                )}
              </div>
            </div>

            <IncidentActions type="report" sites={sites} />
          </div>

          <IncidentsTable incidents={incidents} sites={sites} />
        </div>
      </div>
    </>
  );
}
