import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

interface UnitType {
  name: string;
  sizeSqm: number;
}

interface Unit {
  id: string;
  unitCode: string;
  unitType: UnitType;
}

interface Site {
  id: string;
  name: string;
}

interface Agreement {
  id: string;
  siteId: string;
  unitId: string;
  status: string;
  billingCycle: string;
  effectiveFrom: string | null;
  pricingSnapshot: { amountMinor?: number };
  unit: Unit | null;
  site: Site | null;
}

interface OverdueInvoice {
  id: string;
  dueDate: string;
  totalMinor: number;
  currency: string;
  agreementId: string;
}

interface NextInvoice {
  id: string;
  dueDate: string;
  totalMinor: number;
  currency: string;
}

interface DashboardSummary {
  overdueInvoices: OverdueInvoice[];
  nextInvoice: NextInvoice | null;
}

const STATUS_PILL: Record<string, React.CSSProperties> = {
  pending_signature: { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
  signed: { background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
  active: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
  terminated: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' },
};

const STATUS_DOT: Record<string, string> = {
  pending_signature: '#f59e0b',
  signed: '#0ea5e9',
  active: '#16a34a',
  terminated: '#f87171',
};

function StatusPill({ status, label }: { status: string; label: string }) {
  const pillStyle = STATUS_PILL[status] ?? { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' };
  const dotColor = STATUS_DOT[status] ?? '#94a3b8';
  return (
    <span style={pillStyle}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}

function formatCents(minor?: number, currency = 'EUR'): string {
  if (!minor) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

export default async function MyStoragePage() {
  await requireTenantAuth();
  const t = getT();
  const [agreements, summary] = await Promise.all([
    serverTenantFetch<Agreement[]>('/v1/tenant/agreements').catch(() => [] as Agreement[]),
    serverTenantFetch<DashboardSummary>('/v1/tenant/dashboard').catch(() => ({ overdueInvoices: [], nextInvoice: null } as DashboardSummary)),
  ]);

  const hasOverdue = summary.overdueInvoices.length > 0;

  const STATUS_LABELS: Record<string, string> = {
    pending_signature: t('myStorage.agreement.statusPendingSignature'),
    signed: t('myStorage.agreement.statusSigned'),
    active: t('myStorage.agreement.statusActive'),
    terminated: t('myStorage.agreement.statusTerminated'),
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        .ms-nav-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.10); }
        @media (max-width: 640px) {
          .ms-wrap { padding: 20px 16px !important; }
          .ms-unit-actions { flex-direction: column !important; align-items: stretch !important; }
          .ms-unit-actions a { text-align: center !important; }
        }
      `}</style>
      <div className="ms-wrap" style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>{t('myStorage.nav.title')}</h1>
            <LogoutButton />
          </div>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px' }}>{t('myStorage.nav.subtitle')}</p>

          {hasOverdue && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', margin: '0 0 2px' }}>
                  {summary.overdueInvoices.length === 1
                    ? t('myStorage.dashboard.overdueSingular')
                    : t('myStorage.dashboard.overduePlural', { count: String(summary.overdueInvoices.length) })}
                </p>
                <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>
                  {t('myStorage.dashboard.overdueHint')}{' '}
                  <Link href="/my-storage/invoices" style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'underline' }}>{t('myStorage.dashboard.viewInvoices')}</Link>
                </p>
              </div>
            </div>
          )}

          {summary.nextInvoice && (
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('myStorage.dashboard.nextPayment')}</p>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                  {formatCents(summary.nextInvoice.totalMinor, summary.nextInvoice.currency)}
                </p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  {t('myStorage.dashboard.due', { date: new Date(summary.nextInvoice.dueDate).toLocaleDateString('de-DE') })}
                </p>
              </div>
              <Link href="/my-storage/invoices" style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {t('myStorage.dashboard.viewInvoices')}
              </Link>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <Link href="/my-storage/invoices" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('myStorage.nav.invoicesTitle')}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('myStorage.nav.invoicesSubtitle')}</p>
            </Link>
            <Link href="/my-storage/payment-methods" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('myStorage.nav.paymentMethodsTitle')}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('myStorage.nav.paymentMethodsSubtitle')}</p>
            </Link>
            <Link href="/my-storage/profile" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('myStorage.nav.profileTitle')}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('myStorage.nav.profileSubtitle')}</p>
            </Link>
            <Link href="/my-storage/report-problem" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('myStorage.nav.supportTitle')}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('myStorage.nav.supportSubtitle')}</p>
            </Link>
            <Link href="/my-storage/notifications" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{t('myStorage.nav.notificationsTitle')}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('myStorage.nav.notificationsSubtitle')}</p>
            </Link>
          </div>

          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px', letterSpacing: '-0.01em' }}>{t('myStorage.dashboard.yourUnits')}</h2>

          {agreements.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 8px' }}>{t('myStorage.dashboard.noUnits')}</p>
              <Link href="/storage" style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                {t('myStorage.dashboard.findUnit')}
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {agreements.map((a) => {
                const overdueForUnit = summary.overdueInvoices.filter((inv) => inv.agreementId === a.id);
                return (
                  <div key={a.id} style={{ background: '#ffffff', borderRadius: '12px', border: overdueForUnit.length > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                          {t('myStorage.dashboard.unitLabel', { code: a.unit?.unitCode ?? a.unitId.slice(0, 8) })}
                        </p>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                          {a.site?.name ?? t('myStorage.dashboard.unknownSite')}
                          {a.unit?.unitType ? ` · ${a.unit.unitType.name} · ${a.unit.unitType.sizeSqm} m²` : ''}
                        </p>
                      </div>
                      <StatusPill status={a.status} label={STATUS_LABELS[a.status] ?? a.status.replace(/_/g, ' ')} />
                    </div>

                    <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', margin: 0 }}>
                      <div>
                        <dt style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{t('myStorage.dashboard.monthlyRate')}</dt>
                        <dd style={{ color: '#475569', margin: 0, fontWeight: 600 }}>{formatCents(a.pricingSnapshot?.amountMinor)}</dd>
                      </div>
                      <div>
                        <dt style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{t('myStorage.dashboard.startDate')}</dt>
                        <dd style={{ color: '#475569', margin: 0 }}>{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd>
                      </div>
                    </dl>

                    {overdueForUnit.length > 0 && (
                      <div style={{ marginTop: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                        {overdueForUnit.length === 1
                          ? t('myStorage.dashboard.overdueOne', {
                              amount: formatCents(overdueForUnit[0].totalMinor, overdueForUnit[0].currency),
                              date: new Date(overdueForUnit[0].dueDate).toLocaleDateString('de-DE'),
                            })
                          : t('myStorage.dashboard.overdueMany', { count: String(overdueForUnit.length) })}
                      </div>
                    )}

                    <div className="ms-unit-actions" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Link href={`/my-storage/agreements/${a.id}`} style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                        {t('myStorage.dashboard.viewAgreement')}
                      </Link>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          href={`/my-storage/report-problem?agreementId=${a.id}`}
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                        >
                          {t('myStorage.dashboard.reportProblem')}
                        </Link>
                        {['active', 'signed'].includes(a.status) && (
                          <Link
                            href={`/my-storage/move-out?agreementId=${a.id}`}
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                          >
                            {t('myStorage.dashboard.requestMoveOut')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
