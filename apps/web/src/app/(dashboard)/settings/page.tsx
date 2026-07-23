import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import OrgSettingsForm from './OrgSettingsForm';
import { getT } from '@/lib/get-locale';

interface Organisation {
  id: string;
  legalName: string;
  tradingName: string | null;
  slug: string;
  billingEmail: string;
  supportEmail: string | null;
  phone: string | null;
  website: string | null;
  vatId: string | null;
  taxNumber: string | null;
  plan: string;
  status: string;
}

export default async function SettingsPage() {
  const user = await requireAuth();
  if (user.role === 'billing_admin') redirect('/settings/billing');
  if (user.role !== 'owner') redirect('/dashboard');

  const org = await serverFetch<Organisation>(`/v1/organisations/${user.organisationId}`);
  const t = await getT();

  return (
    <div className="max-w-4xl">
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase text-slate-400">{t('dashboard.settings.plan')}</p>
          <p className="mt-1 text-sm font-bold capitalize text-slate-800">{org.plan}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold uppercase text-slate-400">{t('dashboard.settings.status')}</p>
          <p className="mt-1 text-sm font-bold capitalize text-slate-800">{org.status}</p>
        </div>
      </div>
      <OrgSettingsForm org={org} />
    </div>
  );
}
