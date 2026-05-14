import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import UnitEditForm from './UnitEditForm';
import Link from 'next/link';

interface Unit {
  id: string; unitCode: string; kind: string; status: string; driveUp: boolean;
}

export default async function UnitDetailPage({ params }: { params: { siteId: string; unitId: string } }) {
  const user = await requireAuth();
  const unit = await serverFetch<Unit>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/units/${params.unitId}`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/sites/${params.siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Units</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Unit {unit.unitCode}</h1>
        <UnitEditForm unit={unit} siteId={params.siteId} />
      </div>
    </div>
  );
}
