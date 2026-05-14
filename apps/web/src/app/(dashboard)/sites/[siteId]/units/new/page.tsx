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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/sites/${params.siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Units</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Add a new unit</h1>
        <NewUnitForm siteId={params.siteId} unitTypes={unitTypes} />
      </div>
    </div>
  );
}
