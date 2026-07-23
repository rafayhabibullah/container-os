import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import CustomersTable from './CustomersTable';

interface Customer {
  id: string;
  type: 'private' | 'business' | 'person' | 'organisation';
  personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
  contacts: { email: string }[];
  createdAt: string;
  activeAgreement?: {
    siteName: string;
    unitCode: string;
    monthlyRentMinor: number | null;
    paidThroughDate: string | null;
  } | null;
}

interface Site {
  id: string;
  name: string;
}

export default async function CustomersPage() {
  const user = await requireAuth();
  const t = getT();
  const [customers, sites] = await Promise.all([
    serverFetch<Customer[]>(
      `/v1/organisations/${user.organisationId}/tenants`,
    ).catch(() => [] as Customer[]),
    serverFetch<Site[]>(
      `/v1/organisations/${user.organisationId}/sites`,
    ).catch(() => [] as Site[]),
  ]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {t('dashboard.customers.title')}
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '28px' }}>
            {t(customers.length === 1 ? 'dashboard.customers.count' : 'dashboard.customers.count_plural', { count: String(customers.length) })}
          </p>
          <CustomersTable customers={customers} sites={sites} />
        </div>
      </div>
    </>
  );
}
