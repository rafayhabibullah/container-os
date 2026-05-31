import { requireTenantAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface Agreement {
  id: string;
  unitId: string;
  siteId: string;
  status: string;
  billingCycle: string;
  language: string;
  effectiveFrom: string | null;
  pricingSnapshot: Record<string, unknown>;
  terminationRules: Record<string, unknown>;
  createdAt: string;
  signatories: Signatory[];
}

const AGREEMENT_STATUS_PILL: Record<string, React.CSSProperties> = {
  pending_signature: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
  signed: { background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
  active: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
  terminated: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
};

const AGREEMENT_DOT_COLOR: Record<string, string> = {
  pending_signature: '#f59e0b',
  signed: '#0ea5e9',
  active: '#16a34a',
  terminated: '#f87171',
};

function StatusPill({ status }: { status: string }) {
  const pillStyle = AGREEMENT_STATUS_PILL[status] ?? { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' };
  const dotColor = AGREEMENT_DOT_COLOR[status] ?? '#94a3b8';
  return (
    <span style={pillStyle}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function SignatoryPill({ status, signedAt }: { status: string; signedAt: string | null }) {
  const isSigned = status === 'signed';
  const pillStyle: React.CSSProperties = isSigned
    ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' }
    : { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-block' };
  return (
    <span style={pillStyle}>
      {status}{signedAt ? ` · ${new Date(signedAt).toLocaleDateString('de-DE')}` : ''}
    </span>
  );
}

export default async function TenantAgreementPage({ params }: { params: { id: string } }) {
  await requireTenantAuth();
  const agreement = await serverFetch<Agreement>(`/v1/tenant/agreements/${params.id}`).catch(() => null);
  if (!agreement) return notFound();

  const cardStyle: React.CSSProperties = { background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '24px', marginBottom: '16px' };
  const dtStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' };
  const ddStyle: React.CSSProperties = { color: '#475569', fontSize: '13px', margin: 0 };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Link href="/my-storage" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            &larr; My Storage
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Storage Agreement</h1>
              <p style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', margin: 0 }}>{agreement.id}</p>
            </div>
            <StatusPill status={agreement.status} />
          </div>

          <div style={cardStyle}>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: 0 }}>
              <div>
                <dt style={dtStyle}>Unit</dt>
                <dd style={{ ...ddStyle, fontFamily: 'monospace', fontSize: '12px' }}>{agreement.unitId}</dd>
              </div>
              <div>
                <dt style={dtStyle}>Billing cycle</dt>
                <dd style={{ ...ddStyle, textTransform: 'capitalize' }}>{agreement.billingCycle.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt style={dtStyle}>Start date</dt>
                <dd style={ddStyle}>{agreement.effectiveFrom ? new Date(agreement.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd>
              </div>
              <div>
                <dt style={dtStyle}>Language</dt>
                <dd style={{ ...ddStyle, textTransform: 'uppercase' }}>{agreement.language}</dd>
              </div>
            </dl>
          </div>

          <div style={cardStyle}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>Termination rules</p>
            <pre style={{ fontSize: '12px', color: '#475569', overflow: 'auto', margin: 0, fontFamily: 'monospace' }}>{JSON.stringify(agreement.terminationRules, null, 2)}</pre>
          </div>

          {agreement.signatories.length > 0 && (
            <div style={cardStyle}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>Signatories</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agreement.signatories.map((s) => (
                  <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>{s.personId}</span>
                    <SignatoryPill status={s.status} signedAt={s.signedAt} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <PrintButton />
          </div>
        </div>
      </div>
    </>
  );
}
