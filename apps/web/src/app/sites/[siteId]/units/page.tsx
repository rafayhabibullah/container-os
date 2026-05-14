import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }
interface Unit {
  id: string; unitCode: string; kind: string;
  status: string; driveUp: boolean; unitType: UnitType;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  reserved: 'bg-yellow-100 text-yellow-700',
  occupied: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  out_of_service: 'bg-red-100 text-red-700',
};

export default async function UnitsPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const units = await serverFetch<Unit[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/units`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/sites/${params.siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Site</Link>
            <h1 className="text-2xl font-bold text-slate-900">Units</h1>
          </div>
          {(user.role === 'owner' || user.role === 'operator') && (
            <Link href={`/sites/${params.siteId}/units/new`}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              + Add unit
            </Link>
          )}
        </div>

        {units.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No units yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Code</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-left px-6 py-3">Kind</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{unit.unitCode}</td>
                    <td className="px-6 py-4 text-slate-600">{unit.unitType?.name ?? '—'} ({unit.unitType?.sizeSqm}m²)</td>
                    <td className="px-6 py-4 text-slate-500 capitalize">{unit.kind.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[unit.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {unit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/sites/${params.siteId}/units/${unit.id}`}
                        className="text-blue-600 hover:underline text-sm">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
