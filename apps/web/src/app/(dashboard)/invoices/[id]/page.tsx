import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface InvoiceLine {
  id: string;
  kind: string;
  description: string;
  amountMinor: number;
  vatRate?: number;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amountMinor: number;
  createdAt: string;
}

interface CreditNote {
  id: string;
  amountMinor: number;
  reason: string;
  createdAt: string;
}

interface InvoiceDetail {
  id: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLine[];
  payments: Payment[];
  credits: CreditNote[];
  agreement: {
    customer: {
      id: string;
      personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
    };
  };
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

function tenantName(customer: InvoiceDetail['agreement']['customer']) {
  const d = customer.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || customer.id;
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const invoice = await serverFetch<InvoiceDetail>(
    `/v1/organisations/${user.organisationId}/invoices/${params.id}`,
  );

  const canPay = ['pending', 'sent', 'overdue'].includes(invoice.status);
  const canVoid = user.role === 'owner' && ['pending', 'sent', 'overdue'].includes(invoice.status);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/invoices" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Invoices
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoice</h1>
            <p className="text-slate-500 text-sm font-mono">{invoice.id}</p>
          </div>
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}
          >
            {invoice.status}
          </span>
        </div>

        {/* Meta */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 mb-0.5">Tenant</p>
            <p className="font-medium text-slate-900">{tenantName(invoice.agreement.customer)}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Invoice date</p>
            <p className="font-medium text-slate-900">
              {new Date(invoice.invoiceDate).toLocaleDateString('de-DE')}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Due date</p>
            <p className="font-medium text-slate-900">
              {new Date(invoice.dueDate).toLocaleDateString('de-DE')}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Period</p>
            <p className="font-medium text-slate-900">
              {new Date(invoice.periodStart).toLocaleDateString('de-DE')} –{' '}
              {new Date(invoice.periodEnd).toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
          <h2 className="text-sm font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
            Line items
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Description</th>
                <th className="text-left px-6 py-3">Kind</th>
                <th className="text-right px-6 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-3 text-slate-900">{line.description}</td>
                  <td className="px-6 py-3 text-slate-500">{line.kind}</td>
                  <td className="px-6 py-3 text-right font-mono text-slate-900">
                    {formatMinor(line.amountMinor, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={2} className="px-6 py-3 font-semibold text-slate-700 text-right">
                  Total
                </td>
                <td className="px-6 py-3 text-right font-bold text-slate-900 font-mono">
                  {formatMinor(invoice.totalMinor, invoice.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
            <h2 className="text-sm font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
              Payment history
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Method</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.payments.map((pay) => (
                  <tr key={pay.id}>
                    <td className="px-6 py-3 text-slate-700">{pay.method}</td>
                    <td className="px-6 py-3 text-slate-500">{pay.status}</td>
                    <td className="px-6 py-3 text-right font-mono">{formatMinor(pay.amountMinor, invoice.currency)}</td>
                    <td className="px-6 py-3 text-slate-400">{new Date(pay.createdAt).toLocaleDateString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Credit notes */}
        {invoice.credits.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
            <h2 className="text-sm font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
              Credit notes
            </h2>
            <ul className="divide-y divide-slate-100">
              {invoice.credits.map((cn) => (
                <li key={cn.id} className="px-6 py-3 flex justify-between text-sm">
                  <span className="text-slate-700">{cn.reason}</span>
                  <span className="font-mono text-slate-900">{formatMinor(cn.amountMinor, invoice.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {canPay && (
            <PayNowButton orgId={user.organisationId} invoiceId={invoice.id} />
          )}
          {canVoid && (
            <VoidInvoiceButton orgId={user.organisationId} invoiceId={invoice.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Island action components ─────────────────────────────────────────────────

function PayNowButton({ orgId, invoiceId }: { orgId: string; invoiceId: string }) {
  return (
    <form action="/api/billing/pay-invoice" method="POST">
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button
        type="submit"
        className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700"
      >
        Pay now (Mollie)
      </button>
    </form>
  );
}

function VoidInvoiceButton({ orgId, invoiceId }: { orgId: string; invoiceId: string }) {
  return (
    <form action="/api/billing/void-invoice" method="POST">
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button
        type="submit"
        className="border border-red-300 text-red-600 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-50"
      >
        Void invoice
      </button>
    </form>
  );
}
