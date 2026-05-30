import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Suspense } from 'react';
import AgreementsTable from './AgreementsTable';

interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'terminated';
  billingCycle: 'monthly' | 'fixed_term';
  effectiveFrom: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
}

interface DocumentRow {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  locale: string | null;
  createdAt: string;
}

export default async function AgreementsPage() {
  const user = await requireAuth();

  const [agreements, documents] = await Promise.all([
    serverFetch<Agreement[]>(`/v1/organisations/${user.organisationId}/agreements`).catch(() => [] as Agreement[]),
    serverFetch<DocumentRow[]>(`/v1/organisations/${user.organisationId}/documents`).catch(() => [] as DocumentRow[]),
  ]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 28px', letterSpacing: '-0.02em' }}>
            Agreements
          </h1>

          <Suspense>
            <AgreementsTable agreements={agreements} documents={documents} />
          </Suspense>

        </div>
      </div>
    </>
  );
}
