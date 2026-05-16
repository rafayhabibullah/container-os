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
  await requireAuth();
  const invoices = await serverFetch<Invoice[]>('/v1/tenant/invoices').catch(() => [] as Invoice[]);

  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link href="/my-storage" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            &larr; My Storage
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Invoices</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>Your billing history</p>

          {invoices.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>No invoices yet.</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={thStyle}>Invoice date</th>
                    <th style={thStyle}>Due date</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Status</th>
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
    </>
  );
}
