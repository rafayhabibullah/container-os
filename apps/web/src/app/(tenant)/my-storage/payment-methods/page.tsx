import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';

interface Mandate {
  id: string;
  scheme: string;
  status: string;
  ibanLast4: string | null;
  signedAt: string | null;
}

const MANDATE_STATUS_PILL: Record<string, React.CSSProperties> = {
  pending: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  active: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  cancelled: { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
  revoked: { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' },
};

export default async function PaymentMethodsPage() {
  await requireTenantAuth();
  const t = getT();
  const mandates = await serverTenantFetch<Mandate[]>(`/v1/tenant/mandates`).catch(() => [] as Mandate[]);

  const statusLabels: Record<string, string> = {
    pending: t('myStorage.paymentMethods.statusPending'),
    active: t('myStorage.paymentMethods.statusActive'),
    cancelled: t('myStorage.paymentMethods.statusCancelled'),
    revoked: t('myStorage.paymentMethods.statusRevoked'),
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`@media (max-width: 640px) { .ms-wrap { padding: 20px 16px !important; } }`}</style>
      <div className="ms-wrap" style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t('myStorage.paymentMethods.title')}</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>{t('myStorage.paymentMethods.subtitle')}</p>

          {mandates.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 8px' }}>{t('myStorage.paymentMethods.empty')}</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('myStorage.paymentMethods.emptyHint')}</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              {mandates.map((mandate, i) => (
                <div key={mandate.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < mandates.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', margin: '0 0 2px', textTransform: 'capitalize' }}>
                      {mandate.scheme.replace(/_/g, ' ')}
                      {mandate.ibanLast4 && (
                        <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>···· {mandate.ibanLast4}</span>
                      )}
                    </p>
                    {mandate.signedAt && (
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('myStorage.paymentMethods.signed', { date: new Date(mandate.signedAt).toLocaleDateString('de-DE') })}</p>
                    )}
                  </div>
                  <span style={MANDATE_STATUS_PILL[mandate.status] ?? MANDATE_STATUS_PILL.pending}>
                    {statusLabels[mandate.status] ?? mandate.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
