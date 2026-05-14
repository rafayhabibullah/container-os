import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface AuditEvent {
  id: string; action: string; subjectType: string; subjectId: string;
  actorId: string | null; siteId: string | null; createdAt: string;
}

export default async function AuditPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await requireAuth();
  const page = searchParams.page ?? '1';
  const events = await serverFetch<AuditEvent[]>(
    `/v1/organisations/${user.organisationId}/audit?page=${page}`,
  ).catch(() => []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Action
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Subject
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Actor
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr
                key={e.id}
                className={`hover:bg-blue-50/30 transition-colors ${
                  i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                }`}
              >
                <td className="px-5 py-3.5 font-mono text-xs text-blue-700">{e.action}</td>
                <td className="px-5 py-3.5 text-xs text-slate-600">
                  {e.subjectType}:{e.subjectId.slice(0, 8)}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                  {e.actorId?.slice(0, 8) ?? 'system'}
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-400">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">{events.length} events</span>
          <div className="flex gap-2">
            {parseInt(page) > 1 && (
              <Link
                href={`?page=${parseInt(page) - 1}`}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                ← Prev
              </Link>
            )}
            {events.length === 50 && (
              <Link
                href={`?page=${parseInt(page) + 1}`}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
