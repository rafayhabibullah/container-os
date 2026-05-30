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

type StatusKey = 'pending' | 'sent' | 'paid' | 'overdue' | 'void';

const STATUS_PILL: Record<StatusKey, { dot: string; color: string; bg: string; border: string }> = {
  pending:  { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  sent:     { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  paid:     { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  overdue:  { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  void:     { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
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

function StatusPill({ status }: { status: string }) {
  const pill = STATUS_PILL[status as StatusKey] ?? STATUS_PILL.void;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      borderRadius: '20px',
      padding: '3px 10px',
      fontSize: '12px',
      fontWeight: 600,
      color: pill.color,
      background: pill.bg,
      border: `1px solid ${pill.border}`,
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
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
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Invoices
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </p>
            </div>
            {user.role === 'owner' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <Link
                  href="/invoices/export"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 16px', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}
                >
                  Export DATEV
                </Link>
                <form action="/api/billing/run-invoices" method="POST" style={{ display: 'inline' }}>
                  <input type="hidden" name="organisationId" value={user.organisationId} />
                  <button
                    type="submit"
                    style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Run invoices
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Search…" readOnly style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }} />
          </div>

          {/* Table / empty state */}
          {invoices.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No invoices yet</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Invoices will appear here once generated.</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Invoice date</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Due date</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '10px 16px' }} />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>
                        {tenantName(inv.agreement.customer)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {new Date(inv.invoiceDate).toLocaleDateString('de-DE')}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {new Date(inv.dueDate).toLocaleDateString('de-DE')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                        {formatMinor(inv.totalMinor, inv.currency)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusPill status={inv.status} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Link href={`/invoices/${inv.id}`} style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                          View →
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
    </>
  );
}
