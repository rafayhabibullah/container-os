import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import Link from 'next/link';
import { RunResultBanner } from './run-result-banner';
import { InvoicesTable } from './invoices-table';

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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: {
    siteId?: string;
    status?: string;
    runCreated?: string;
    runSkipped?: string;
    runErrors?: string;
    runError?: string;
  };
}) {
  const user = await requireAuth();
  const t = getT();

  let runResultMessage: { message: string; isError: boolean } | null = null;
  if (searchParams?.runError) {
    runResultMessage = { message: t('dashboard.invoices.runResult.error'), isError: true };
  } else if (searchParams?.runCreated !== undefined || searchParams?.runSkipped !== undefined) {
    runResultMessage = {
      message: t('dashboard.invoices.runResult.summary', {
        created: String(searchParams?.runCreated ?? '0'),
        skipped: String(searchParams?.runSkipped ?? '0'),
      }),
      isError: false,
    };
  }

  const params = new URLSearchParams();
  if (searchParams?.siteId) params.set('siteId', searchParams.siteId);
  if (searchParams?.status) params.set('status', searchParams.status);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const invoices = await serverFetch<InvoiceRow[]>(
    `/v1/organisations/${user.organisationId}/invoices${qs}`,
  ).catch(() => [] as InvoiceRow[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {t('dashboard.invoices.title')}
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                {t(invoices.length === 1 ? 'dashboard.invoices.count' : 'dashboard.invoices.count_plural', { count: String(invoices.length) })}
              </p>
            </div>
            {user.role === 'owner' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href="/invoices/export"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 16px', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}
                >
                  {t('dashboard.invoices.exportDatev')}
                </Link>
                <form action="/api/billing/run-invoices" method="POST" style={{ display: 'inline' }}>
                  <input type="hidden" name="organisationId" value={user.organisationId} />
                  <button
                    type="submit"
                    style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    {t('dashboard.invoices.runInvoices')}
                  </button>
                </form>
              </div>
            )}
          </div>

          {runResultMessage && (
            <RunResultBanner message={runResultMessage.message} isError={runResultMessage.isError} />
          )}

          <InvoicesTable
            invoices={invoices}
            labels={{
              searchPlaceholder: t('dashboard.invoices.searchPlaceholder'),
              customer: t('dashboard.invoices.table.customer'),
              invoiceDate: t('dashboard.invoices.table.invoiceDate'),
              dueDate: t('dashboard.invoices.table.dueDate'),
              amount: t('dashboard.invoices.table.amount'),
              status: t('dashboard.invoices.table.status'),
              view: t('dashboard.invoices.table.view'),
              emptyTitle: t('dashboard.invoices.empty.title'),
              emptyHint: t('dashboard.invoices.empty.hint'),
              noResults: t('dashboard.invoices.noResults'),
            }}
            statusLabels={{
              pending: t('dashboard.invoices.status.pending'),
              sent: t('dashboard.invoices.status.sent'),
              paid: t('dashboard.invoices.status.paid'),
              overdue: t('dashboard.invoices.status.overdue'),
              void: t('dashboard.invoices.status.void'),
            }}
          />
        </div>
      </div>
    </>
  );
}
