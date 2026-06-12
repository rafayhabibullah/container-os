import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import Link from 'next/link';
import ReportProblemForm from './ReportProblemForm';

interface Agreement {
  id: string;
  unitId: string;
  status: string;
  unit: { unitCode: string } | null;
}

export default async function ReportProblemPage({ searchParams }: { searchParams: { agreementId?: string } }) {
  await requireTenantAuth();
  const t = getT();
  const all = await serverTenantFetch<Agreement[]>('/v1/tenant/agreements').catch(() => [] as Agreement[]);
  const agreements = all.filter((a) => ['active', 'signed'].includes(a.status));

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`@media (max-width: 640px) { .ms-wrap { padding: 20px 16px !important; } }`}</style>
      <div className="ms-wrap" style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <Link href="/my-storage" style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
            {t('myStorage.backLink')}
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t('myStorage.reportProblem.title')}</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>{t('myStorage.reportProblem.subtitle')}</p>
          <ReportProblemForm agreements={agreements} defaultAgreementId={searchParams.agreementId ?? ''} />
        </div>
      </div>
    </>
  );
}
