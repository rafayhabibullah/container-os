import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';
import SignButton from './SignButton';

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface UnitType { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[]; }
interface Unit { id: string; unitCode: string; kind: string; status: string; driveUp: boolean; conditionState: string | null; unitType: UnitType | null; }
interface Site { id: string; name: string; slug: string; address: { street: string; city: string; postalCode: string; country: string }; status: string; timezone: string; currency: string; }
interface PricingSnapshot { amountMinor?: number; vatRate?: number; ruleId?: string; promoId?: string | null; depositMinor?: number; }
interface TerminationRules { noticeDays?: number; minimumMonths?: number; }
interface Agreement {
  id: string;
  unitId: string;
  siteId: string;
  status: string;
  billingCycle: string;
  language: string;
  effectiveFrom: string | null;
  createdAt: string;
  pricingSnapshot: PricingSnapshot;
  terminationRules: TerminationRules;
  signatories: Signatory[];
  unit: Unit | null;
  site: Site | null;
}

const STATUS_STYLE: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  pending_signature: { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  signed:            { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  active:            { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  terminated:        { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const SIGNATORY_STATUS: Record<string, { bg: string; border: string; color: string; dot: string }> = {
  signed:  { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', dot: '#16a34a' },
  pending: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', dot: '#f59e0b' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCents(minor: number | undefined, currency = 'EUR') {
  if (minor == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>
        {value ?? <span style={{ color: '#cbd5e1' }}>—</span>}
      </span>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.03em' }}>{title}</span>
    </div>
  );
}

function Section({ children, filled }: { children: React.ReactNode; filled?: boolean }) {
  const style: React.CSSProperties = filled
    ? { background: '#f8fafc', borderRadius: '10px', padding: '14px 16px' }
    : { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' };
  return <div style={style}>{children}</div>;
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 500, color: '#475569' }}>
      {label}
    </span>
  );
}

export default async function TenantAgreementPage({ params }: { params: { id: string } }) {
  await requireTenantAuth();
  const t = getT();
  const agreement = await serverTenantFetch<Agreement>(`/v1/tenant/agreements/${params.id}`).catch(() => null);
  if (!agreement) return notFound();

  const STATUS_LABELS: Record<string, string> = {
    pending_signature: t('myStorage.agreement.statusPendingSignature'),
    signed: t('myStorage.agreement.statusSigned'),
    active: t('myStorage.agreement.statusActive'),
    terminated: t('myStorage.agreement.statusTerminated'),
  };

  const needsMySignature = agreement.status === 'pending_signature';
  const statStyle = STATUS_STYLE[agreement.status] ?? { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
  const statLabel = STATUS_LABELS[agreement.status] ?? agreement.status.replace(/_/g, ' ');
  const pricing = agreement.pricingSnapshot ?? {};
  const termination = agreement.terminationRules ?? {};
  const unit = agreement.unit;
  const unitType = unit?.unitType ?? null;
  const site = agreement.site;
  const currency = site?.currency ?? 'EUR';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <Link href="/my-storage" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', width: 'fit-content' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t('myStorage.nav.title')}
          </Link>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{t('myStorage.agreement.title')}</h1>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>{agreement.id}</span>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              background: statStyle.bg, color: statStyle.text, border: `1px solid ${statStyle.border}`,
              borderRadius: '20px', padding: '5px 13px', fontSize: '12px', fontWeight: 700,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statStyle.dot, flexShrink: 0 }} />
              {statLabel}
            </span>
          </div>

          {/* Quick facts */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Field label={t('myStorage.agreement.startDate')} value={agreement.effectiveFrom ? fmt(agreement.effectiveFrom) : '—'} />
              <Field label={t('myStorage.agreement.billingCycle')} value={agreement.billingCycle.replace(/_/g, ' ')} />
              <Field label={t('myStorage.agreement.language')} value={agreement.language.toUpperCase()} />
            </div>
          </div>

          {/* Unit */}
          <Section>
            <SectionHeader title={t('myStorage.agreement.unitSection')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="13" rx="2" stroke="#64748b" strokeWidth="1.8"/>
                <path d="M3 10h18M8 6V4M16 6V4" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            } />
            {unit ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label={t('myStorage.agreement.unitCode')} value={<span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px' }}>{unit.unitCode}</span>} />
                <Field label={t('myStorage.agreement.kind')} value={unit.kind.replace(/_/g, ' ')} />
                <Field label={t('myStorage.agreement.driveUp')} value={unit.driveUp ? t('myStorage.agreement.yes') : t('myStorage.agreement.no')} />
                {unit.conditionState && <Field label={t('myStorage.agreement.condition')} value={unit.conditionState} />}
                {unitType && (
                  <>
                    <Field label={t('myStorage.agreement.type')} value={unitType.name} />
                    <Field label={t('myStorage.agreement.size')} value={`${unitType.sizeSqm} m²${unitType.sizeCbm ? ` / ${unitType.sizeCbm} m³` : ''}`} />
                    {unitType.doorType && <Field label={t('myStorage.agreement.doorType')} value={unitType.doorType.replace(/_/g, ' ')} />}
                  </>
                )}
              </div>
            ) : (
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>{agreement.unitId}</span>
            )}
            {unitType && unitType.features.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>{t('myStorage.agreement.features')}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {unitType.features.map((f) => <Chip key={f} label={f.replace(/_/g, ' ')} />)}
                </div>
              </div>
            )}
          </Section>

          {/* Site */}
          <Section>
            <SectionHeader title={t('myStorage.agreement.locationSection')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 21s-7-6.75-7-11a7 7 0 1 1 14 0c0 4.25-7 11-7 11z" stroke="#64748b" strokeWidth="1.8" strokeLinejoin="round"/>
                <circle cx="12" cy="10" r="2.5" stroke="#64748b" strokeWidth="1.8"/>
              </svg>
            } />
            {site ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Field label={t('myStorage.agreement.facility')} value={<span style={{ fontWeight: 700 }}>{site.name}</span>} />
                <Field label={t('myStorage.agreement.address')} value={`${site.address.street}, ${site.address.postalCode} ${site.address.city}, ${site.address.country}`} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label={t('myStorage.agreement.timezone')} value={site.timezone} />
                  <Field label={t('myStorage.agreement.currency')} value={site.currency} />
                </div>
              </div>
            ) : (
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>{agreement.siteId}</span>
            )}
          </Section>

          {/* Pricing */}
          <Section>
            <SectionHeader title={t('myStorage.agreement.pricingSection')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#64748b" strokeWidth="1.8"/>
                <path d="M12 6v12M9 9.5C9 8.12 10.34 7 12 7s3 1.12 3 2.5c0 1.37-1.34 2.5-3 2.5s-3 1.13-3 2.5C9 15.88 10.34 17 12 17s3-1.12 3-2.5" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            } />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label={t('myStorage.agreement.monthlyRentNet')} value={fmtCents(pricing.amountMinor, currency)} />
              <Field label={t('myStorage.agreement.vatRate')} value={pricing.vatRate != null ? `${(pricing.vatRate * 100).toFixed(0)} %` : '—'} />
              {pricing.amountMinor != null && pricing.vatRate != null && (
                <Field
                  label={t('myStorage.agreement.monthlyRentGross')}
                  value={fmtCents(Math.round(pricing.amountMinor * (1 + pricing.vatRate)), currency)}
                />
              )}
              {pricing.depositMinor != null && (
                <Field label={t('myStorage.agreement.deposit')} value={fmtCents(pricing.depositMinor, currency)} />
              )}
            </div>
          </Section>

          {/* Termination rules */}
          <Section>
            <SectionHeader title={t('myStorage.agreement.terminationSection')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            } />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label={t('myStorage.agreement.noticePeriod')} value={termination.noticeDays != null ? t('myStorage.agreement.noticeDays', { days: String(termination.noticeDays) }) : '—'} />
              {termination.minimumMonths != null && (
                <Field label={t('myStorage.agreement.minimumTerm')} value={t('myStorage.agreement.minimumMonths', { months: String(termination.minimumMonths) })} />
              )}
            </div>
          </Section>

          {/* Signatories */}
          {agreement.signatories.length > 0 && (
            <Section>
              <SectionHeader title={t('myStorage.agreement.signatoriesSection')} icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              } />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {agreement.signatories.map((s) => {
                  const ss = SIGNATORY_STATUS[s.status] ?? SIGNATORY_STATUS.pending;
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                          {s.personId.slice(0, 1).toUpperCase()}
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b' }}>{s.personId}</span>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ss.dot, flexShrink: 0 }} />
                        {s.status}{s.signedAt ? ` · ${fmt(s.signedAt)}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Sign CTA */}
          {needsMySignature && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#1e40af', fontWeight: 600, margin: '0 0 14px' }}>
                {t('myStorage.agreement.signRequired')}
              </p>
              <SignButton agreementId={agreement.id} />
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <PrintButton />
          </div>

        </div>
      </div>
    </>
  );
}
