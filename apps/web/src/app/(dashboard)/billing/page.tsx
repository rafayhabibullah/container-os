import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';

interface OrgProfile {
  id: string;
  legalName: string;
  plan: string;
}

interface PlanUsage {
  plan: string;
  sites: { used: number; limit: number };
  units: { used: number; limit: number };
}

const PLAN_DETAILS: Record<string, { key: string; price: string; sites: number; units: number }> = {
  starter:      { key: 'starter',      price: '€49/mo',  sites: 1, units: 50  },
  growth:       { key: 'growth',       price: '€99/mo',  sites: 2, units: 150 },
  pro:          { key: 'pro',          price: '€199/mo', sites: 5, units: 500 },
  professional: { key: 'professional', price: '€199/mo', sites: 5, units: 500 },
};

export default async function BillingPage() {
  const user = await requireAuth();
  const t = getT();
  const org = await serverFetch<OrgProfile>(`/v1/organisations/${user.organisationId}`).catch(() => null);
  const usage = await serverFetch<PlanUsage>(`/v1/organisations/${user.organisationId}/usage`).catch(() => null);

  const plan    = org?.plan ?? 'starter';
  const details = PLAN_DETAILS[plan] ?? PLAN_DETAILS.starter;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {t('dashboard.billing.title')}
            </h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {t('dashboard.billing.subtitle')}
            </p>
          </div>

          {/* Current plan card */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {t('dashboard.billing.currentPlan')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {t(`dashboard.billing.plans.${details.key}`)}
                  </h2>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                    {t('dashboard.billing.active')}
                  </span>
                </div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#475569', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{details.price}</p>
              </div>
              <button style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {t('dashboard.billing.upgradePlan')}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
              {[
                { label: t('dashboard.billing.sitesIncluded'),         value: String(details.sites), color: '#0f172a' },
                { label: t('dashboard.billing.unitsIncluded'),         value: String(details.units), color: '#0f172a' },
                { label: t('dashboard.billing.marketplaceCommission'), value: '0%',                  color: '#15803d' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 800, color, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plan usage */}
          {usage && (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {t('dashboard.billing.usage.title')}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {[
                  { label: t('dashboard.billing.usage.sites'), data: usage.sites },
                  { label: t('dashboard.billing.usage.units'), data: usage.units },
                ].map(({ label, data }) => (
                  <div key={label}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {label}
                    </p>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {data.used} {t('dashboard.billing.usage.of')} {Number.isFinite(data.limit) ? data.limit : t('dashboard.billing.usage.unlimited')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available plans */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.billing.availablePlans')}</span>
            </div>
            <div>
              {Object.entries(PLAN_DETAILS).filter(([key]) => key !== 'professional').map(([key, p], i, arr) => {
                const isCurrent = key === plan || (key === 'pro' && plan === 'professional');
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 20px',
                      background: isCurrent ? '#f8fafc' : '#ffffff',
                      borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t(`dashboard.billing.plans.${p.key}`)}</span>
                      <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {t(p.sites === 1 ? 'dashboard.billing.sites' : 'dashboard.billing.sites_plural', { count: String(p.sites) })} · {t('dashboard.billing.units', { count: String(p.units) })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{p.price}</span>
                      {isCurrent ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                          {t('dashboard.billing.current')}
                        </span>
                      ) : (
                        <button style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {t('dashboard.billing.switch')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
