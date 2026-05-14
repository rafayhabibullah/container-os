import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import IncidentActions from './IncidentActions';
import Link from 'next/link';

interface Incident { id: string; type: string; status: string; severity: string; siteId: string; createdAt: string; }

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default async function IncidentsPage() {
  const user = await requireAuth();
  const incidents = await serverFetch<Incident[]>(`/v1/organisations/${user.organisationId}/incidents`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
          </div>
          <IncidentActions type="report" />
        </div>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {incidents.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No incidents reported.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-left px-6 py-3">Severity</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Reported</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{inc.type}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_COLORS[inc.severity] ?? 'bg-slate-100 text-slate-500'}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 capitalize">{inc.status.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(inc.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {inc.status !== 'resolved' && (
                        <IncidentActions type="update" incidentId={inc.id} currentStatus={inc.status} />
                      )}
                    </td>
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
