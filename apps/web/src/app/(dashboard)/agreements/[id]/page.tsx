import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AgreementDetailActions from './AgreementDetailActions';

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface Amendment { id: string; type: string; effectiveFrom: string; }
interface AgreementDocument { id: string; kind: string; locale: string | null; scanStatus: string; version: number; createdAt: string; }
interface TerminationRequest { id: string; status: string; requestedDate: string; operatorNote: string | null; }
interface InspectionRun { id: string; kind: string; result: string | null; reportDocumentId: string | null; completedAt: string | null; }
interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  reservationId: string;
  status: string;
  billingCycle: string;
  language: string;
  effectiveFrom: string | null;
  pricingSnapshot: Record<string, unknown>;
  terminationRules: Record<string, unknown>;
  createdAt: string;
  signatories: Signatory[];
  amendments: Amendment[];
  documents: AgreementDocument[];
  terminationRequests: TerminationRequest[];
  inspections: InspectionRun[];
}

const STATUS_PILL: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  draft:             { dot: '#94a3b8', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  pending_signature: { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  signed:            { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  active:            { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  terminated:        { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

function StatusPill({ status, label }: { status: string; label: string }) {
  const s = STATUS_PILL[status] ?? STATUS_PILL.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}

function signatoryPill(status: string) {
  if (status === 'signed')   return { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
  if (status === 'declined') return { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  return { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' };
}

function documentStatusPill(status: 'ready' | 'missing' | 'not_needed') {
  if (status === 'ready') return { label: 'Ready', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
  if (status === 'not_needed') return { label: 'Not needed yet', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
  return { label: 'Missing', color: '#92400e', bg: '#fffbeb', border: '#fde68a' };
}

function hasDocument(documents: AgreementDocument[], kinds: string[]) {
  return documents.some((document) => kinds.includes(document.kind));
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
  overflow: 'hidden',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: '0 0 12px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default async function AgreementDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const t = getT();
  const agreement = await serverFetch<Agreement>(
    `/v1/organisations/${user.organisationId}/agreements/${params.id}`,
  ).catch(() => null);

  if (!agreement) return notFound();

  const hasSignedSignatory = agreement.signatories.some((signatory) => signatory.status === 'signed');
  const hasMoveInReport = agreement.inspections.some((inspection) => (
    inspection.kind === 'move_in' && (inspection.reportDocumentId || inspection.completedAt)
  ));
  const hasMoveOutReport = agreement.inspections.some((inspection) => (
    inspection.kind === 'move_out' && (inspection.reportDocumentId || inspection.completedAt)
  ));
  const hasTermination = agreement.terminationRequests.length > 0 || agreement.status === 'terminated';
  const packageItems = [
    {
      label: 'Contract PDF',
      detail: 'Initial rental agreement document',
      status: hasDocument(agreement.documents, ['contract_pdf', 'contract']) ? 'ready' as const : 'missing' as const,
    },
    {
      label: 'Signed PDF',
      detail: 'Signed contract copy stored as proof',
      status: hasDocument(agreement.documents, ['signed_contract']) ? 'ready' as const : hasSignedSignatory ? 'missing' as const : 'not_needed' as const,
    },
    {
      label: 'Evidence pack',
      detail: 'Combined proof package for disputes and audit',
      status: hasDocument(agreement.documents, ['evidence_pack']) ? 'ready' as const : 'missing' as const,
    },
    {
      label: 'Move-in report',
      detail: 'Condition evidence at handover',
      status: hasMoveInReport ? 'ready' as const : 'missing' as const,
    },
    {
      label: 'Move-out report',
      detail: 'Condition evidence at return',
      status: hasMoveOutReport ? 'ready' as const : hasTermination ? 'missing' as const : 'not_needed' as const,
    },
    {
      label: 'Termination notice',
      detail: 'Tenant/operator move-out documentation',
      status: hasDocument(agreement.documents, ['termination_notice']) ? 'ready' as const : hasTermination ? 'missing' as const : 'not_needed' as const,
    },
    {
      label: 'Deposit deduction notice',
      detail: 'Required when move-out deductions are recorded',
      status: hasDocument(agreement.documents, ['deposit_deduction_notice']) ? 'ready' as const : 'not_needed' as const,
    },
  ];
  const missingPackageItems = packageItems.filter((item) => item.status === 'missing').length;
  const timelineItems = [
    ...agreement.documents.map((document) => ({
      id: `document-${document.id}`,
      date: document.createdAt,
      label: `${document.kind.replaceAll('_', ' ')} document`,
      detail: `v${document.version} · ${document.scanStatus}`,
    })),
    ...agreement.inspections.map((inspection) => ({
      id: `inspection-${inspection.id}`,
      date: inspection.completedAt ?? agreement.createdAt,
      label: `${inspection.kind.replaceAll('_', ' ')} inspection`,
      detail: inspection.result ?? 'pending',
    })),
    ...agreement.terminationRequests.map((request) => ({
      id: `termination-${request.id}`,
      date: request.requestedDate,
      label: 'Move-out request',
      detail: request.status,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          <Link href="/agreements" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>{t('dashboard.agreements.detail.backLink')}</Link>

          {/* Page title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t('dashboard.agreements.detail.title')}</h1>
              <p style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'ui-monospace, monospace', margin: 0 }}>{agreement.id}</p>
            </div>
            <StatusPill status={agreement.status} label={t(`dashboard.agreements.status.${agreement.status}`)} />
          </div>

          {/* Details + Pricing snapshot grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Details */}
            <div style={{ ...cardStyle, padding: '20px' }}>
              <p style={sectionLabelStyle}>{t('dashboard.agreements.detail.details')}</p>
              <dl style={{ margin: 0 }}>
                {[
                  [t('dashboard.agreements.detail.billingCycle'), agreement.billingCycle.replace('_', ' ')],
                  [t('dashboard.agreements.detail.language'), agreement.language.toUpperCase()],
                  [t('dashboard.agreements.detail.effectiveFrom'), agreement.effectiveFrom ? new Date(agreement.effectiveFrom).toLocaleDateString('de-DE') : '—'],
                  [t('dashboard.agreements.detail.created'), new Date(agreement.createdAt).toLocaleDateString('de-DE')],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                    <dt style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</dt>
                    <dd style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Pricing snapshot */}
            <div style={{ ...cardStyle, padding: '20px' }}>
              <p style={sectionLabelStyle}>{t('dashboard.agreements.detail.pricingSnapshot')}</p>
              <pre style={{ fontSize: '12px', color: '#475569', overflowX: 'auto', margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                {JSON.stringify(agreement.pricingSnapshot, null, 2)}
              </pre>
            </div>
          </div>

          {/* Signatories */}
          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            <p style={sectionLabelStyle}>{t('dashboard.agreements.detail.signatories')}</p>
            {agreement.signatories.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>{t('dashboard.agreements.detail.noSignatories')}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agreement.signatories.map((s) => {
                  const pill = signatoryPill(s.status);
                  return (
                    <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontFamily: 'ui-monospace, monospace' }}>{s.personId}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: pill.bg, color: pill.color, border: `1px solid ${pill.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, display: 'inline-block', flexShrink: 0 }} />
                        {s.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Amendments */}
          {agreement.amendments.length > 0 && (
            <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
              <p style={sectionLabelStyle}>{t('dashboard.agreements.detail.amendments')}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agreement.amendments.map((a) => (
                  <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{a.type}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(a.effectiveFrom).toLocaleDateString('de-DE')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <p style={sectionLabelStyle}>Agreement package</p>
                <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {missingPackageItems === 0 ? 'Document package is complete' : `${missingPackageItems} document${missingPackageItems === 1 ? '' : 's'} need attention`}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                  Contract, signature, inspection, termination, and evidence records for this agreement.
                </p>
              </div>
              <span style={{ background: missingPackageItems === 0 ? '#f0fdf4' : '#fffbeb', color: missingPackageItems === 0 ? '#15803d' : '#92400e', border: `1px solid ${missingPackageItems === 0 ? '#bbf7d0' : '#fde68a'}`, borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {packageItems.length - missingPackageItems}/{packageItems.length} covered
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              {packageItems.map((item) => {
                const pill = documentStatusPill(item.status);
                return (
                  <div key={item.label} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{item.label}</span>
                      <span style={{ background: pill.bg, color: pill.color, border: `1px solid ${pill.border}`, borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{pill.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.45 }}>{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            <p style={sectionLabelStyle}>Documents and evidence</p>
            {agreement.documents.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>No generated agreement documents yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agreement.documents.map((document) => (
                  <li key={document.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{document.kind.replaceAll('_', ' ')}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>v{document.version} · {document.scanStatus} · {new Date(document.createdAt).toLocaleDateString('de-DE')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {timelineItems.length > 0 && (
            <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
              <p style={sectionLabelStyle}>Evidence timeline</p>
              {timelineItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', color: '#0f172a' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(item.date).toLocaleDateString('de-DE')}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>{item.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ ...cardStyle, padding: '20px' }}>
            <p style={sectionLabelStyle}>{t('dashboard.agreements.detail.actions')}</p>
            <AgreementDetailActions agreement={agreement} />
          </div>

        </div>
      </div>
    </>
  );
}
