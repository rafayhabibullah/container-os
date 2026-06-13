import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';

interface PaymentRow {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  method: string;
  amountMinor: number;
  reference: string;
  createdAt: string;
  invoice: { id: string; currency: string };
}

const STATUS_PILL: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  pending:   { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  succeeded: { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  failed:    { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  refunded:  { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

const defaultPill = { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' };

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

export default async function PaymentsPage() {
  const user = await requireAuth();
  const t = getT();
  const payments = await serverFetch<PaymentRow[]>(
    `/v1/organisations/${user.organisationId}/payments`,
  ).catch(() => [] as PaymentRow[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {t('dashboard.payments.title')}
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
            {t(payments.length === 1 ? 'dashboard.payments.count' : 'dashboard.payments.count_plural', { count: String(payments.length) })}
          </p>

          {/* Search bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder={t('dashboard.payments.searchPlaceholder')} readOnly style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }} />
          </div>

          {payments.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>{t('dashboard.payments.empty.title')}</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t('dashboard.payments.empty.hint')}</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {(['reference', 'method', 'amount', 'status', 'date'] as const).map((h) => (
                      <th key={h} style={thStyle}>{t(`dashboard.payments.table.${h}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const pill = STATUS_PILL[p.status] ?? defaultPill;
                    return (
                      <tr key={p.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#475569' }}>{p.reference}</td>
                        <td style={{ padding: '12px 16px', color: '#475569', textTransform: 'capitalize' }}>{t(`dashboard.payments.method.${p.method}`)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {formatMinor(p.amountMinor, p.invoice.currency)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, background: pill.bg, color: pill.color, border: `1px solid ${pill.border}` }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
                            {t(`dashboard.payments.status.${p.status}`)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>
                          {new Date(p.createdAt).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
