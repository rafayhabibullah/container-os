import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import IncidentActions from './IncidentActions';

interface Incident {
  id: string;
  type: string;
  status: string;
  severity: string;
  siteId: string;
  createdAt: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  low: 'success',
  medium: 'warning',
  high: 'warning',
  critical: 'destructive',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'warning',
  in_progress: 'default',
  resolved: 'success',
};

export default async function IncidentsPage() {
  const user = await requireAuth();
  const incidents = await serverFetch<Incident[]>(
    `/v1/organisations/${user.organisationId}/incidents`,
  ).catch(() => []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Incidents</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <IncidentActions type="report" />
      </div>

      {/* Table / empty state */}
      {incidents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No incidents reported.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Severity
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Reported
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc, i) => (
                <tr
                  key={inc.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {inc.type}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={SEVERITY_VARIANT[inc.severity] ?? 'outline'}>
                      {inc.severity}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANT[inc.status] ?? 'outline'}>
                      {inc.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    {new Date(inc.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {inc.status !== 'resolved' && (
                      <IncidentActions
                        type="update"
                        incidentId={inc.id}
                        currentStatus={inc.status}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {incidents.length} of {incidents.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
