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
    <div className="max-w-4xl">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-slate-900">Zahlungseinrichtung</h2>
        <p className="mt-1 text-sm text-slate-500">Verbinde das Mollie-Konto der Organisation, damit Mietzahlungen direkt dem Betreiber zugeordnet werden.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="font-bold text-slate-500">Status</dt><dd className="font-semibold text-slate-900">{account?.status ?? 'not_connected'}</dd>
          <dt className="font-bold text-slate-500">Mollie-Konto</dt><dd className="font-semibold text-slate-900">{account?.providerAccountId ?? '-'}</dd>
          <dt className="font-bold text-slate-500">Verbunden am</dt><dd className="font-semibold text-slate-900">{account?.onboardingCompletedAt ? new Date(account.onboardingCompletedAt).toLocaleString('de-DE') : '-'}</dd>
        </dl>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <PaymentAccountActions onboardingUrl={account?.onboardingUrl ?? null} />
        </div>
      </div>
    </div>
  );
}
