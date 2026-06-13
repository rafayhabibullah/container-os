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
  if (user.role !== 'owner') redirect('/dashboard');

  const org = await serverFetch<Organisation>(`/v1/organisations/${user.organisationId}`);
  const t = await getT();

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {t('dashboard.settings.title')}
            </h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              {t('dashboard.settings.plan')}: <span style={{ fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>{org.plan}</span>
              {' · '}
              {t('dashboard.settings.status')}: <span style={{ fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>{org.status}</span>
            </p>
          </div>
          <OrgSettingsForm org={org} />
        </div>
      </div>
    </>
  );
}
