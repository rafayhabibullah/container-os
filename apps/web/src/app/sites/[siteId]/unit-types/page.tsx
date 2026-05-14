import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[]; }

export default async function UnitTypesPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const unitTypes = await serverFetch<UnitType[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/sites/${params.siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Site</Link>
            <h1 className="text-2xl font-bold text-slate-900">Unit Types</h1>
          </div>
          {user.role === 'owner' && (
            <Link href={`/sites/${params.siteId}/unit-types/new`}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              + Add type
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {unitTypes.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No unit types yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Size (m²)</th>
                  <th className="text-left px-6 py-3">Door</th>
                  <th className="text-left px-6 py-3">Features</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unitTypes.map((ut) => (
                  <tr key={ut.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{ut.name}</td>
                    <td className="px-6 py-4 text-slate-600">{ut.sizeSqm}</td>
                    <td className="px-6 py-4 text-slate-500">{ut.doorType ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{ut.features.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
