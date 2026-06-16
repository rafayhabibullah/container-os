import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import InspectionActions from './InspectionActions';
import InspectionsPageClient from './InspectionsPageClient';
import PlanLockedNotice from '../components/PlanLockedNotice';

interface InspectionRow {
  id: string;
  siteId: string | null;
  siteName?: string | null;
  unitId: string;
  unitCode?: string | null;
  kind: string;
  result: string | null;
  checklist: { code: string; label: string; result: string; note?: string }[] | null;
  notes: string | null;
  depositDeduction: number | null;
  completedAt: string | null;
  createdAt: string;
  photoIds?: string[];
}

interface Site {
  id: string;
  name: string;
}

interface Entitlements {
  plan: string;
  features: string[];
}

export default async function InspectionsPage() {
  const user = await requireAuth();
  const t = getT();
  const [inspections, sites, entitlements] = await Promise.all([
    serverFetch<InspectionRow[]>(`/v1/organisations/${user.organisationId}/inspections`).catch(() => [] as InspectionRow[]),
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => [] as Site[]),
    serverFetch<Entitlements>(`/v1/organisations/${user.organisationId}/entitlements`).catch(() => ({ plan: 'free', features: [] } as Entitlements)),
  ]);
  const operationsEnabled = entitlements.features.includes('operations');

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
                {t('dashboard.inspections.title')}
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {failed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    {t('dashboard.inspections.failed', { count: String(failed) })}
                  </span>
                )}
                {inProgress > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.inspections.inProgress', { count: String(inProgress) })}
                  </span>
                )}
                {passed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.inspections.passed', { count: String(passed) })}
                  </span>
                )}
                {inspections.length === 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.inspections.noneYet')}
                  </span>
                )}
              </div>
            </div>
            {operationsEnabled && <InspectionActions sites={sites} />}
          </div>

          {operationsEnabled ? (
            <InspectionsPageClient inspections={inspections} />
          ) : (
            <PlanLockedNotice
              title="Inspections are available on Professional"
              body={`Your current ${entitlements.plan} plan keeps simple operations lean. Upgrade when you want move-in, move-out and routine inspection reports with photos, failed-item follow-up tasks and agreement evidence.`}
            />
          )}
        </div>
      </div>
    </>
  );
}
