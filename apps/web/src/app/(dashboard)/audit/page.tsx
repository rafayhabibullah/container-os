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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        </div>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Action</th>
                <th className="text-left px-6 py-3">Subject</th>
                <th className="text-left px-6 py-3">Actor</th>
                <th className="text-left px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs text-blue-700">{e.action}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">{e.subjectType}:{e.subjectId.slice(0, 8)}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs font-mono">{e.actorId?.slice(0, 8) ?? 'system'}</td>
                  <td className="px-6 py-3 text-slate-400 text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No audit events yet.</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-slate-100 flex gap-4">
            {parseInt(page) > 1 && (
              <Link href={`?page=${parseInt(page) - 1}`} className="text-sm text-blue-600 hover:underline">&larr; Previous</Link>
            )}
            {events.length === 50 && (
              <Link href={`?page=${parseInt(page) + 1}`} className="text-sm text-blue-600 hover:underline">Next &rarr;</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
