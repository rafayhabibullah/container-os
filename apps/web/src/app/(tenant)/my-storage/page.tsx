import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
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

function StatusPill({ status }: { status: string }) {
  const pillStyle = STATUS_PILL[status] ?? { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' };
  const dotColor = STATUS_DOT[status] ?? '#94a3b8';
  return (
    <span style={pillStyle}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function formatCents(minor?: number): string {
  if (!minor) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function MyStoragePage() {
  await requireTenantAuth();
  const agreements = await serverTenantFetch<Agreement[]>('/v1/tenant/agreements').catch(() => [] as Agreement[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.ms-nav-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.10); }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>My Storage</h1>
            <LogoutButton />
          </div>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>Manage your storage units and payments</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <Link href="/my-storage/invoices" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Invoices</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>View your billing history</p>
            </Link>
            <Link href="/my-storage/payment-methods" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Payment Methods</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Manage your SEPA mandates</p>
            </Link>
          </div>

          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px', letterSpacing: '-0.01em' }}>Your Units</h2>

          {agreements.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 8px' }}>You have no active storage units.</p>
              <Link href="/storage" style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                Find a storage unit &rarr;
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {agreements.map((a) => (
                <div key={a.id} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontWeight: 800, color: '#0f172a', fontSize: '16px', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                        Unit {a.unit?.unitCode ?? a.unitId.slice(0, 8)}
                      </p>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                        {a.site?.name ?? 'Unknown site'}
                        {a.unit?.unitType ? ` · ${a.unit.unitType.name} · ${a.unit.unitType.sizeSqm} m²` : ''}
                      </p>
                    </div>
                    <StatusPill status={a.status} />
                  </div>

                  <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', margin: 0 }}>
                    <div>
                      <dt style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Monthly rate</dt>
                      <dd style={{ color: '#475569', margin: 0, fontWeight: 600 }}>{formatCents(a.pricingSnapshot?.amountMinor)}</dd>
                    </div>
                    <div>
                      <dt style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Start date</dt>
                      <dd style={{ color: '#475569', margin: 0 }}>{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd>
                    </div>
                  </dl>

                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link href={`/my-storage/agreements/${a.id}`} style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                      View agreement &rarr;
                    </Link>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        href={`/my-storage/report-problem?agreementId=${a.id}`}
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                      >
                        Report problem
                      </Link>
                      {['active', 'signed'].includes(a.status) && (
                        <Link
                          href={`/my-storage/move-out?agreementId=${a.id}`}
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                        >
                          Request move-out
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
