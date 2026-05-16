import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import NewUnitForm from './NewUnitForm';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }

export default async function NewUnitPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const unitTypes = await serverFetch<UnitType[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`,
  ).catch(() => []);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link href={`/sites/${params.siteId}/units`} style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            ← Units
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Add a new unit
          </h1>
          <NewUnitForm siteId={params.siteId} unitTypes={unitTypes} />
        </div>
      </div>
    </>
  );
}
