import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'terminated';
  billingCycle: 'monthly' | 'fixed_term';
  effectiveFrom: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

export default async function AgreementsPage() {
  const user = await requireAuth();
  const agreements = await serverFetch<Agreement[]>(
    `/v1/organisations/${user.organisationId}/agreements`,
  ).catch(() => [] as Agreement[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Agreements</h1>
          </div>
        </div>

        {agreements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No agreements yet.</p>
            <Link href="/reservations" className="text-blue-600 text-sm hover:underline mt-2 block">
              Go to reservations to create one &rarr;
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Tenant</th>
                  <th className="text-left px-6 py-3">Billing</th>
                  <th className="text-left px-6 py-3">Effective from</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agreements.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{a.id.slice(0, 12)}…</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{a.tenantId.slice(0, 10)}…</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{a.billingCycle.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/agreements/${a.id}`} className="text-blue-600 hover:underline text-xs">
                        View
                      </Link>
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
