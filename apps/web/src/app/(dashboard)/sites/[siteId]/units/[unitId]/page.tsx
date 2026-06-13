import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import UnitEditForm from './UnitEditForm';
import Link from 'next/link';

interface Unit {
  id: string; unitCode: string; kind: string; status: string; driveUp: boolean;
}

export default async function UnitDetailPage({ params }: { params: { siteId: string; unitId: string } }) {
  const t = getT();
  const user = await requireAuth();
  const unit = await serverFetch<Unit>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/units/${params.unitId}`,
  );

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link href={`/sites/${params.siteId}/units`} style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            {t('dashboard.sites.unitDetail.backToUnits')}
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t('dashboard.sites.unitDetail.title', { code: unit.unitCode })}
          </h1>
          <UnitEditForm unit={unit} siteId={params.siteId} />
        </div>
      </div>
    </>
  );
}
