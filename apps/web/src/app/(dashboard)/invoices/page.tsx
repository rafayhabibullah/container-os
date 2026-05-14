import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface InvoiceRow {
  id: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  siteId: string;
  agreement: {
    customer: {
      id: string;
      personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
    };
  };
  lines?: unknown[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-slate-100 text-slate-400',
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

function tenantName(customer: InvoiceRow['agreement']['customer']) {
  const d = customer.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || customer.id;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: { siteId?: string; status?: string };
}) {
  const user = await requireAuth();
  const params = new URLSearchParams();
  if (searchParams?.siteId) params.set('siteId', searchParams.siteId);
  if (searchParams?.status) params.set('status', searchParams.status);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const invoices = await serverFetch<InvoiceRow[]>(
    `/v1/organisations/${user.organisationId}/invoices${qs}`,
  ).catch(() => [] as InvoiceRow[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">
              &larr; Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          </div>
          <div className="flex gap-3">
            {user.role === 'owner' && (
              <>
                <ExportDatevButton orgId={user.organisationId} />
                <RunInvoicesButton orgId={user.organisationId} />
              </>
            )}
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No invoices found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Tenant</th>
                  <th className="text-left px-6 py-3">Invoice date</th>
                  <th className="text-left px-6 py-3">Due date</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {tenantName(inv.agreement.customer)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(inv.invoiceDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900">
                      {formatMinor(inv.totalMinor, inv.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status] ?? 'bg-slate-100 text-slate-500'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
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

// ─── Island components ────────────────────────────────────────────────────────

function RunInvoicesButton({ orgId }: { orgId: string }) {
  return (
    <form action={`/api/billing/run-invoices`} method="POST">
      <input type="hidden" name="organisationId" value={orgId} />
      <button
        type="submit"
        className="bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800"
      >
        Run invoices
      </button>
    </form>
  );
}

function ExportDatevButton({ orgId }: { orgId: string }) {
  return (
    <Link
      href={`/invoices/export`}
      className="border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50"
    >
      Export DATEV
    </Link>
  );
}
