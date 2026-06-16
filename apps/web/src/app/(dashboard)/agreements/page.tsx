import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
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
  siteName: string | null;
  unitCode: string | null;
  unitTypeName: string | null;
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
  const t = getT();

  const [agreements, documents] = await Promise.all([
    serverFetch<Agreement[]>(`/v1/organisations/${user.organisationId}/agreements`).catch(() => [] as Agreement[]),
    serverFetch<DocumentRow[]>(`/v1/organisations/${user.organisationId}/documents`).catch(() => [] as DocumentRow[]),
  ]);
  const agreementDocumentCount = documents.filter((document) => document.subjectType === 'agreement').length;
  const evidencePackCount = documents.filter((document) => document.kind === 'evidence_pack').length;
  const signedDocumentCount = documents.filter((document) => document.kind === 'signed_contract').length;
  const activeAgreementCount = agreements.filter((agreement) => agreement.status === 'active').length;
  const pendingSignatureCount = agreements.filter((agreement) => agreement.status === 'pending_signature').length;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 28px', letterSpacing: '-0.02em' }}>
            {t('dashboard.agreements.title')}
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '12px', marginBottom: '18px' }}>
            {[
              { label: 'Active agreements', value: activeAgreementCount },
              { label: 'Pending signature', value: pendingSignatureCount },
              { label: 'Agreement docs', value: agreementDocumentCount },
              { label: 'Signed PDFs', value: signedDocumentCount },
              { label: 'Evidence packs', value: evidencePackCount },
            ].map((item) => (
              <div key={item.label} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{item.value}</p>
              </div>
            ))}
          </div>

          <Suspense>
            <AgreementsTable agreements={agreements} documents={documents} />
          </Suspense>

        </div>
      </div>
    </>
  );
}
