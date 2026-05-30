import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import CustomersTable from './CustomersTable';

interface Customer {
  id: string;
  type: 'person' | 'organisation';
  personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
  contacts: { email: string }[];
  createdAt: string;
}

export default async function CustomersPage() {
  const user = await requireAuth();
  const customers = await serverFetch<Customer[]>(
    `/v1/organisations/${user.organisationId}/customers`,
  ).catch(() => [] as Customer[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Customers
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '28px' }}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
          <CustomersTable customers={customers} />
        </div>
      </div>
    </>
  );
}
