import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import Link from 'next/link';
import PayInvoiceButton from './PayInvoiceButton';

interface Invoice {
  id: string;
  agreementId: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  totalMinor: number;
  currency: string;
}

const INVOICE_STATUS_PILL: Record<string, React.CSSProperties> = {
  pending: { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  sent: { background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  paid: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  overdue: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  void: { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
};

function formatCents(minor: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

export default async function MyInvoicesPage() {
  await requireTenantAuth();
  const t = getT();
  const invoices = await serverTenantFetch<Invoice[]>('/v1/tenant/invoices').catch(() => [] as Invoice[]);

  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' };

  const statusLabels: Record<string, string> = {
    pending: t('myStorage.invoices.statusPending'),
    sent: t('myStorage.invoices.statusSent'),
    paid: t('myStorage.invoices.statusPaid'),
    overdue: t('myStorage.invoices.statusOverdue'),
    void: t('myStorage.invoices.statusVoid'),
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        .tbl-row:hover { background: #f8fafc; }
        @media (max-width: 640px) {
          .ms-wrap { padding: 20px 16px !important; }
          .ms-tbl-wrap { overflow-x: auto; }
        }
      `}</style>
      <div className="ms-wrap" style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link href="/my-storage" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            {t('myStorage.myStorageLink')}
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t('myStorage.invoices.title')}</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>{t('myStorage.invoices.subtitle')}</p>

          {invoices.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>{t('myStorage.invoices.empty')}</p>
            </div>
          ) : (
            <div className="ms-tbl-wrap" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={thStyle}>{t('myStorage.invoices.colInvoiceDate')}</th>
                    <th style={thStyle}>{t('myStorage.invoices.colDueDate')}</th>
                    <th style={thStyle}>{t('myStorage.invoices.colAmount')}</th>
                    <th style={thStyle}>{t('myStorage.invoices.colStatus')}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t('myStorage.invoices.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{new Date(inv.invoiceDate).toLocaleDateString('de-DE')}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{new Date(inv.dueDate).toLocaleDateString('de-DE')}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{formatCents(inv.totalMinor, inv.currency)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={INVOICE_STATUS_PILL[inv.status] ?? INVOICE_STATUS_PILL.pending}>
                          {statusLabels[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {['pending', 'sent', 'overdue'].includes(inv.status) ? (
                          <PayInvoiceButton invoiceId={inv.id} label={t('myStorage.invoices.pay')} />
                        ) : null}
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
