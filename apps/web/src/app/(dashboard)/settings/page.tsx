import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import OrgSettingsForm from './OrgSettingsForm';
import Link from 'next/link';

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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Organisation settings</h1>
        <p className="text-slate-500 text-sm mb-8">
          Plan: <strong className="capitalize">{org.plan}</strong> ·{' '}
          Status: <strong className="capitalize">{org.status}</strong>
        </p>
        <OrgSettingsForm org={org} />
      </div>
    </div>
  );
}
