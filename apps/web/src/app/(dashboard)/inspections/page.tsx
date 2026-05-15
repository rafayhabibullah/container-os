import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import InspectionActions from './InspectionActions';
import InspectionsTable from './InspectionsTable';

interface InspectionRow {
  id: string;
  siteId: string | null;
  unitId: string;
  kind: string;
  result: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface Site {
  id: string;
  name: string;
}

export default async function InspectionsPage() {
  const user = await requireAuth();
  const [inspections, sites] = await Promise.all([
    serverFetch<InspectionRow[]>(`/v1/organisations/${user.organisationId}/inspections`).catch(() => [] as InspectionRow[]),
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => [] as Site[]),
  ]);

  const passed     = inspections.filter((i) => i.result === 'pass').length;
  const failed     = inspections.filter((i) => i.result === 'fail').length;
  const inProgress = inspections.filter((i) => !i.result).length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Inspections
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {failed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    {failed} failed
                  </span>
                )}
                {inProgress > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {inProgress} in progress
                  </span>
                )}
                {passed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {passed} passed
                  </span>
                )}
                {inspections.length === 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    No inspections yet
                  </span>
                )}
              </div>
            </div>
            <InspectionActions sites={sites} />
          </div>

          <InspectionsTable inspections={inspections} />
        </div>
      </div>
    </>
  );
}
