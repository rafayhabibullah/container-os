import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search, Plus } from 'lucide-react';

interface InspectionRow {
  id: string;
  unitId: string;
  kind: string;
  result: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default async function InspectionsPage() {
  const user = await requireAuth();
  const inspections = await serverFetch<InspectionRow[]>(
    `/v1/organisations/${user.organisationId}/inspections`,
  ).catch(() => [] as InspectionRow[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inspections</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {inspections.length} inspection{inspections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New inspection
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search inspections…</span>
        </div>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No inspections recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Unit', 'Kind', 'Result', 'Completed', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inspections.map((insp, i) => (
                <tr key={insp.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{insp.unitId.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{insp.kind}</td>
                  <td className="px-4 py-3">
                    {insp.result
                      ? <Badge variant={insp.result === 'pass' ? 'success' : 'destructive'}>{insp.result}</Badge>
                      : <Badge variant="default">In progress</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {insp.completedAt ? new Date(insp.completedAt).toLocaleDateString('de-DE') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(insp.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
