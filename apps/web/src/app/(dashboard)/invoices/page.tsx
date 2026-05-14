import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface InvoiceRow {
  id: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  agreement: {
    customer: {
      id: string;
      personOrOrgData: {
        firstName?: string;
        lastName?: string;
        companyName?: string;
        name?: string;
      };
    };
  };
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'warning',
  sent: 'default',
  paid: 'success',
  overdue: 'destructive',
  void: 'outline',
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(
    minor / 100,
  );
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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user.role === 'owner' && (
          <div className="flex gap-2">
            <Link
              href="/invoices/export"
              className="border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Export DATEV
            </Link>
            <form action="/api/billing/run-invoices" method="POST">
              <input type="hidden" name="organisationId" value={user.organisationId} />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Run invoices
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Search toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search invoices…</span>
        </div>
      </div>

      {/* Table / empty state */}
      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No invoices found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Tenant
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Invoice date
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Due date
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {tenantName(inv.agreement.customer)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {new Date(inv.invoiceDate).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {new Date(inv.dueDate).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900">
                    {formatMinor(inv.totalMinor, inv.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANT[inv.status] ?? 'outline'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {invoices.length} of {invoices.length}
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
