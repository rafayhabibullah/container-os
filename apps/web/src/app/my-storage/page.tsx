import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Agreement {
  id: string;
  siteId: string;
  unitId: string;
  status: string;
  billingCycle: string;
  effectiveFrom: string | null;
  pricingSnapshot: { amountMinor?: number };
}

const STATUS_STYLES: Record<string, string> = {
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

function formatCents(minor?: number): string {
  if (!minor) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function MyStoragePage() {
  await requireAuth();
  const agreements = await serverFetch<Agreement[]>('/v1/tenant/agreements').catch(() => [] as Agreement[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Storage</h1>
          <Link href="/my-storage/invoices" className="text-sm text-blue-600 hover:underline">
            View invoices &rarr;
          </Link>
        </div>

        {agreements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500 text-sm">You have no active storage agreements.</p>
            <Link href="/storage" className="text-blue-600 text-sm hover:underline mt-2 block">
              Find a storage unit &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {agreements.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-900">Unit {a.unitId.slice(0, 8)}…</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{a.id}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-slate-400 text-xs">Billing</dt><dd className="text-slate-700 capitalize">{a.billingCycle.replace('_', ' ')}</dd></div>
                  <div><dt className="text-slate-400 text-xs">Monthly rate</dt><dd className="text-slate-700">{formatCents(a.pricingSnapshot?.amountMinor)}</dd></div>
                  <div><dt className="text-slate-400 text-xs">Start date</dt><dd className="text-slate-700">{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd></div>
                </dl>
                <div className="mt-4">
                  <Link href={`/my-storage/agreements/${a.id}`} className="text-blue-600 text-sm hover:underline">
                    View agreement &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
