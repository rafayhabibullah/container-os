import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import PaymentAccountActions from './payment-account-actions';

interface PaymentAccount {
  status: string;
  onboardingUrl?: string | null;
  providerAccountId?: string | null;
  onboardingCompletedAt?: string | null;
}

export default async function PaymentSettingsPage() {
  const user = await requireAuth();
  const account = await serverFetch<PaymentAccount>(`/v1/organisations/${user.organisationId}/payment-account`).catch(() => null);

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Zahlungen</h1>
        <p style={{ color: '#64748b' }}>Verbinden Sie das Mollie-Konto der Organisation, damit Mietzahlungen direkt dem Betreiber zugeordnet werden.</p>
        <dl style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, fontSize: 14 }}>
          <dt>Status</dt><dd>{account?.status ?? 'not_connected'}</dd>
          <dt>Mollie Konto</dt><dd>{account?.providerAccountId ?? '-'}</dd>
          <dt>Verbunden am</dt><dd>{account?.onboardingCompletedAt ? new Date(account.onboardingCompletedAt).toLocaleString('de-DE') : '-'}</dd>
        </dl>
        <PaymentAccountActions onboardingUrl={account?.onboardingUrl ?? null} />
      </div>
    </main>
  );
}
