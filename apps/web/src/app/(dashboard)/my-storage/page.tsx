import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
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

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  pending_signature: 'warning',
  signed: 'default',
  active: 'success',
  terminated: 'destructive',
};

function formatCents(minor?: number): string {
  if (!minor) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function MyStoragePage() {
  await requireAuth();
  const agreements = await serverFetch<Agreement[]>('/v1/tenant/agreements').catch(() => [] as Agreement[]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-slate-900">My Storage</h1>
        <Link href="/my-storage/invoices" className="text-sm text-blue-600 hover:underline">
          View invoices &rarr;
        </Link>
      </div>

      {agreements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-slate-500 text-sm">You have no active storage agreements.</p>
          <Link href="/storage" className="text-blue-600 text-sm hover:underline mt-2 block">
            Find a storage unit &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900">Unit {a.unitId.slice(0, 8)}…</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{a.id}</p>
                </div>
                <Badge variant={STATUS_VARIANT[a.status] ?? 'outline'}>
                  {a.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-400 text-xs">Billing</dt><dd className="text-slate-700 capitalize">{a.billingCycle.replace(/_/g, ' ')}</dd></div>
                <div><dt className="text-slate-400 text-xs">Monthly rate</dt><dd className="text-slate-700">{formatCents(a.pricingSnapshot?.amountMinor)}</dd></div>
                <div><dt className="text-slate-400 text-xs">Start date</dt><dd className="text-slate-700">{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd></div>
              </dl>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link href={`/my-storage/agreements/${a.id}`} className="text-sm text-blue-600 font-medium hover:text-blue-700">
                  View agreement &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
