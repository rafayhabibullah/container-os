import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

interface Agreement {
  id: string;
  siteId: string;
  unitId: string;
  status: string;
  billingCycle: string;
  effectiveFrom: string | null;
  pricingSnapshot: { amountMinor?: number };
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
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>Manage your storage agreements and payments</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
            <Link href="/my-storage/invoices" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Invoices</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>View your billing history</p>
            </Link>
            <Link href="/my-storage/payment-methods" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Payment Methods</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Manage your SEPA mandates</p>
            </Link>
            <Link href="/my-storage/move-out" className="ms-nav-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '20px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Request Move-out</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>End your rental agreement</p>
            </Link>
          </div>

          {agreements.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 8px' }}>You have no active storage agreements.</p>
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
                      <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', margin: '0 0 2px' }}>Unit {a.unitId.slice(0, 8)}…</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', margin: 0 }}>{a.id}</p>
                    </div>
                    <StatusPill status={a.status} />
                  </div>
                  <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', margin: 0 }}>
                    <div>
                      <dt style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Billing</dt>
                      <dd style={{ color: '#475569', textTransform: 'capitalize', margin: 0 }}>{a.billingCycle.replace(/_/g, ' ')}</dd>
                    </div>
                    <div>
                      <dt style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Monthly rate</dt>
                      <dd style={{ color: '#475569', margin: 0 }}>{formatCents(a.pricingSnapshot?.amountMinor)}</dd>
                    </div>
                    <div>
                      <dt style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Start date</dt>
                      <dd style={{ color: '#475569', margin: 0 }}>{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd>
                    </div>
                  </dl>
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <Link href={`/my-storage/agreements/${a.id}`} style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                      View agreement &rarr;
                    </Link>
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
