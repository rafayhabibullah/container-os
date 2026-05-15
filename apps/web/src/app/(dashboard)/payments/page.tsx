import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface PaymentRow {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  method: string;
  amountMinor: number;
  reference: string;
  createdAt: string;
  invoice: { id: string; currency: string };
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'warning',
  succeeded: 'success',
  failed: 'destructive',
  refunded: 'outline',
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

export default async function PaymentsPage() {
  const user = await requireAuth();
  const payments = await serverFetch<PaymentRow[]>(
    `/v1/organisations/${user.organisationId}/payments`,
  ).catch(() => [] as PaymentRow[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-400 mt-0.5">{payments.length} record{payments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search payments…</span>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Reference', 'Method', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.reference}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{p.method.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 tabular-nums">
                    {formatMinor(p.amountMinor, p.invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(p.createdAt).toLocaleDateString('de-DE')}
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
