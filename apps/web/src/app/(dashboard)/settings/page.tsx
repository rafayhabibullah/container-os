import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import OrgSettingsForm from './OrgSettingsForm';

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
  if (user.role !== 'owner') redirect('/dashboard');

  const org = await serverFetch<Organisation>(`/v1/organisations/${user.organisationId}`);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Organisation settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Plan: <span className="font-medium text-slate-600 capitalize">{org.plan}</span>
          {' · '}
          Status: <span className="font-medium text-slate-600 capitalize">{org.status}</span>
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <OrgSettingsForm org={org} />
      </div>
    </div>
  );
}
