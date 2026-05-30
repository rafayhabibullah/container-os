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

type StatusKey = 'pending' | 'sent' | 'paid' | 'overdue' | 'void';

const STATUS_PILL: Record<StatusKey, { dot: string; color: string; bg: string; border: string }> = {
  pending: { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  sent:    { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  paid:    { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  overdue: { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  void:    { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
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

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const invoice = await serverFetch<InvoiceDetail>(
    `/v1/organisations/${user.organisationId}/invoices/${params.id}`,
  );

  const canPay = ['pending', 'sent', 'overdue'].includes(invoice.status);
  const canVoid = user.role === 'owner' && ['pending', 'sent', 'overdue'].includes(invoice.status);

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
    overflow: 'hidden',
    marginBottom: '20px',
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <Link href="/invoices" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            ← Invoices
          </Link>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Invoice</h1>
              <p style={{ margin: 0, fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>{invoice.id}</p>
            </div>
            <StatusPill status={invoice.status} />
          </div>

          {/* Meta card */}
          <div style={{ ...cardStyle, padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{tenantName(invoice.agreement.customer)}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invoice date</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{new Date(invoice.invoiceDate).toLocaleDateString('de-DE')}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Due date</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>{new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Period</p>
                <p style={{ margin: 0, fontWeight: 600, color: '#0f172a' }}>
                  {new Date(invoice.periodStart).toLocaleDateString('de-DE')} – {new Date(invoice.periodEnd).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div style={cardStyle}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#475569' }}>Line items</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Kind</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 16px', color: '#0f172a' }}>{line.description}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{line.kind}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a' }}>
                      {formatMinor(line.amountMinor, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Total</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {formatMinor(invoice.totalMinor, invoice.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment history */}
          {invoice.payments.length > 0 && (
            <div style={cardStyle}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#475569' }}>Payment history</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={thStyle}>Method</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                    <th style={thStyle}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((pay) => (
                    <tr key={pay.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', color: '#0f172a' }}>{pay.method}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{pay.status}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a' }}>
                        {formatMinor(pay.amountMinor, invoice.currency)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        {new Date(pay.createdAt).toLocaleDateString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Credit notes */}
          {invoice.credits.length > 0 && (
            <div style={cardStyle}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#475569' }}>Credit notes</h2>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {invoice.credits.map((cn) => (
                  <li key={cn.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid #f8fafc' }}>
                    <span style={{ color: '#475569' }}>{cn.reason}</span>
                    <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>
                      {formatMinor(cn.amountMinor, invoice.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {(canPay || canVoid) && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {canPay && <PayNowButton orgId={user.organisationId} invoiceId={invoice.id} />}
              {canVoid && <VoidInvoiceButton orgId={user.organisationId} invoiceId={invoice.id} />}
            </div>
          )}
        </div>
      </div>
    </>
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
        style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
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
        style={{ border: '1px solid #fecaca', color: '#dc2626', background: '#fef2f2', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
      >
        Void invoice
      </button>
    </form>
  );
}
