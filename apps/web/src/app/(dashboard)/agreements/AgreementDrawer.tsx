'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

interface AgreementSummary {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  status: string;
  billingCycle: string;
  effectiveFrom: string | null;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
}

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface Amendment { id: string; type: string; effectiveFrom: string; }

interface UnitDetail {
  id: string; unitCode: string; kind: string; status: string; driveUp: boolean; conditionState: string | null;
}
interface UnitTypeDetail {
  id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[];
}
interface SiteDetail {
  id: string; name: string; slug: string;
  address: { street: string; city: string; postalCode: string; country: string };
  status: string; timezone: string; currency: string;
}

interface AgreementDetails extends AgreementSummary {
  reservationId: string;
  language: string;
  pricingSnapshot: Record<string, unknown>;
  terminationRules: Record<string, unknown>;
  signatories: Signatory[];
  amendments: Amendment[];
  unit: UnitDetail | null;
  unitType: UnitTypeDetail | null;
  site: SiteDetail | null;
}

const STATUS_PILL: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  draft:             { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  pending_signature: { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  signed:            { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  active:            { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  terminated:        { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{value ?? <span style={{ color: '#cbd5e1' }}>—</span>}</span>
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

function SkeletonLine({ width = '100%', height = 14 }: { width?: string; height?: number }) {
  return <div style={{ width, height, background: '#f1f5f9', borderRadius: '4px', animation: 'skeleton-pulse 1.4s ease infinite' }} />;
}

function signatoryStyle(status: string) {
  if (status === 'signed')   return { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
  if (status === 'declined') return { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  return { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' };
}

export default function AgreementDrawer({ agreement, onClose }: { agreement: AgreementSummary; onClose: () => void }) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<AgreementDetails | null>(null);
  const [fetching, setFetching] = useState(true);

  const stat = STATUS_PILL[agreement.status] ?? STATUS_PILL.draft;
  const isTerminal = ['terminated'].includes(agreement.status);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setFetching(true);
    fetch(`/api/agreements/${agreement.id}`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: AgreementDetails) => setDetails(data))
      .catch(() => setDetails(null))
      .finally(() => setFetching(false));
  }, [agreement.id]);

  async function sendForSignature() {
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'send' },
      body: JSON.stringify({ personIds: [agreement.tenantId] }),
    });
    setLoading(false);
    onClose();
    router.refresh();
  }

  async function terminate() {
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'terminate' },
      body: JSON.stringify({}),
    });
    setLoading(false);
    onClose();
    router.refresh();
  }

  const btnBase: React.CSSProperties = {
    flex: 1, padding: '9px 14px', borderRadius: '8px', fontSize: '13px',
    fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1, fontFamily: 'inherit', border: 'none',
  };

  return (
    <>
      <style>{`
        @keyframes agr-drawer-backdrop { from { opacity: 0 } to { opacity: 1 } }
        @keyframes agr-drawer-slide    { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes skeleton-pulse      { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
        .agr-drawer-backdrop { animation: agr-drawer-backdrop 0.2s ease both; }
        .agr-drawer-panel    { animation: agr-drawer-slide 0.25s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div
        className="agr-drawer-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 40, backdropFilter: 'blur(2px)' }}
      />

      <div
        className="agr-drawer-panel"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
          background: '#ffffff', zIndex: 50, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>{t('dashboard.agreements.drawer.title')}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>{agreement.id}</div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`,
              borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 600,
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, flexShrink: 0 }} />
              {t(`dashboard.agreements.status.${agreement.status}`)}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, color: '#64748b',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Customer */}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title={t('dashboard.agreements.drawer.customer')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            } />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '14px', fontWeight: 700, flexShrink: 0,
              }}>
                {(agreement.customerName ?? agreement.tenantId).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {agreement.customerName ?? <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>{agreement.tenantId}</span>}
                </div>
                {agreement.customerEmail && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{agreement.customerEmail}</div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label={t('dashboard.agreements.drawer.billingCycle')} value={(details?.billingCycle ?? agreement.billingCycle).replace('_', ' ')} />
            <Field label={t('dashboard.agreements.drawer.language')} value={fetching ? <SkeletonLine width="40px" height={13} /> : (details?.language?.toUpperCase() ?? '—')} />
            <Field label={t('dashboard.agreements.drawer.effectiveFrom')} value={agreement.effectiveFrom ? fmt(agreement.effectiveFrom) : '—'} />
            <Field label={t('dashboard.agreements.drawer.created')} value={fmtTime(agreement.createdAt)} />
            {details?.reservationId && (
              <Field label={t('dashboard.agreements.drawer.reservation')} value={<span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{details.reservationId.slice(0, 12)}…</span>} />
            )}
          </div>

          {/* Unit */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title={t('dashboard.agreements.drawer.unit')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="#64748b" strokeWidth="1.8"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/></svg>
            } />
            {fetching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonLine width="40%" /><SkeletonLine width="65%" /><SkeletonLine width="50%" />
              </div>
            ) : details?.unit ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label={t('dashboard.agreements.drawer.unitCode')} value={<span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px' }}>{details.unit.unitCode}</span>} />
                <Field label={t('dashboard.agreements.drawer.kind')} value={details.unit.kind.replace(/_/g, ' ')} />
                <Field label={t('dashboard.agreements.drawer.driveUp')} value={details.unit.driveUp ? t('dashboard.agreements.drawer.yes') : t('dashboard.agreements.drawer.no')} />
                {details.unitType && <>
                  <Field label={t('dashboard.agreements.drawer.type')} value={<span style={{ fontWeight: 700 }}>{details.unitType.name}</span>} />
                  <Field label={t('dashboard.agreements.drawer.size')} value={`${details.unitType.sizeSqm} m²${details.unitType.sizeCbm ? ` / ${details.unitType.sizeCbm} m³` : ''}`} />
                  {details.unitType.doorType && <Field label={t('dashboard.agreements.drawer.door')} value={details.unitType.doorType.replace(/_/g, ' ')} />}
                </>}
                {details.unitType && details.unitType.features.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>{t('dashboard.agreements.drawer.features')}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {details.unitType.features.map((f) => (
                        <span key={f} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 500, color: '#475569' }}>
                          {f.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>{agreement.unitId}</span>
            )}
          </div>

          {/* Site */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title={t('dashboard.agreements.drawer.site')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-6.75-7-11a7 7 0 1 1 14 0c0 4.25-7 11-7 11z" stroke="#64748b" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="#64748b" strokeWidth="1.8"/></svg>
            } />
            {fetching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonLine width="50%" /><SkeletonLine width="80%" /><SkeletonLine width="40%" />
              </div>
            ) : details?.site ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Field label={t('dashboard.agreements.drawer.name')} value={<span style={{ fontWeight: 700 }}>{details.site.name}</span>} />
                <Field label={t('dashboard.agreements.drawer.address')} value={
                  <span>
                    {details.site.address.street}<br />
                    {details.site.address.postalCode} {details.site.address.city}, {details.site.address.country}
                  </span>
                } />
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>{agreement.siteId}</span>
            )}
          </div>

          {/* Signatories */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title={t('dashboard.agreements.drawer.signatories')} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            } />
            {fetching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonLine width="70%" />
                <SkeletonLine width="55%" />
              </div>
            ) : !details ? (
              <span style={{ fontSize: '12px', color: '#f87171' }}>{t('dashboard.agreements.drawer.loadError')}</span>
            ) : details.signatories.length === 0 ? (
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('dashboard.agreements.drawer.noSignatories')}</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {details.signatories.map((s) => {
                  const p = signatoryStyle(s.status);
                  return (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>{s.personId}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: p.bg, color: p.color, border: `1px solid ${p.border}`,
                        borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                        {s.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Amendments */}
          {!fetching && details && details.amendments.length > 0 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
              <SectionHeader title={t('dashboard.agreements.drawer.amendments')} icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/></svg>
              } />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {details.amendments.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{a.type}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{fmt(a.effectiveFrom)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Actions footer */}
        {!isTerminal && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
            {agreement.status === 'draft' && (
              <button onClick={sendForSignature} disabled={loading} style={{ ...btnBase, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                {t('dashboard.agreements.actions.sendForSignature')}
              </button>
            )}
            <button onClick={terminate} disabled={loading} style={{ ...btnBase, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {t('dashboard.agreements.actions.terminate')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
