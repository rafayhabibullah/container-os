import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Invoice {
  id: string;
  agreementId: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  totalMinor: number;
  currency: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  void: 'bg-slate-100 text-slate-400',
};

function formatCents(minor: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

export default async function MyInvoicesPage() {
  await requireAuth();
  const invoices = await serverFetch<Invoice[]>('/v1/tenant/invoices').catch(() => [] as Invoice[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/my-storage" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; My Storage</Link>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500 text-sm">No invoices yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Invoice date</th>
                  <th className="text-left px-6 py-3">Due date</th>
                  <th className="text-left px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{new Date(inv.invoiceDate).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(inv.dueDate).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{formatCents(inv.totalMinor, inv.currency)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {inv.status}
                      </span>
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
