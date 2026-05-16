import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import PricingActions from './PricingActions';
import Link from 'next/link';

interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface UnitType { id: string; name: string; }

const PB_STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  draft:     { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: 'Draft'     },
  published: { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Published' },
  archived:  { dot: '#cbd5e1', text: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Archived'  },
};

export default async function PricingPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const [priceBooks, unitTypes] = await Promise.all([
    serverFetch<PriceBook[]>(`/v1/organisations/${user.organisationId}/sites/${params.siteId}/price-books`).catch(() => []),
    serverFetch<UnitType[]>(`/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`).catch(() => []),
  ]);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .pricing-row:hover { background: #f8fafc; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <Link href={`/sites/${params.siteId}`} style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '16px' }}>
            ← Site
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pricing
            </h1>
            {user.role === 'owner' && (
              <PricingActions type="create-book" siteId={params.siteId} unitTypes={unitTypes} />
            )}
          </div>

          {priceBooks.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No price books yet</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create a price book to define rates for your unit types.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {priceBooks.map((pb) => {
                const stat = PB_STATUS[pb.status] ?? PB_STATUS.draft;
                return (
                  <div key={pb.id} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                    {/* Price book header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{pb.name}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block' }} />
                          {stat.label}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          from {new Date(pb.effectiveFrom).toLocaleDateString()}
                        </span>
                      </div>
                      {user.role === 'owner' && pb.status !== 'archived' && (
                        <PricingActions
                          type="book-actions"
                          siteId={params.siteId}
                          priceBookId={pb.id}
                          bookStatus={pb.status}
                          unitTypes={unitTypes}
                        />
                      )}
                    </div>

                    {/* Rate rules table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <th style={{ textAlign: 'left', padding: '9px 20px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Unit type</th>
                          <th style={{ textAlign: 'left', padding: '9px 20px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Price / month</th>
                          <th style={{ textAlign: 'left', padding: '9px 20px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Billing cycle</th>
                          {user.role === 'owner' && pb.status === 'draft' && <th style={{ padding: '9px 20px' }} />}
                        </tr>
                      </thead>
                      <tbody>
                        {pb.rules.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              No rate rules yet.
                            </td>
                          </tr>
                        ) : pb.rules.map((rule, i) => (
                          <tr key={rule.id} className="pricing-row" style={{ borderBottom: i < pb.rules.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                            <td style={{ padding: '11px 20px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              {unitTypes.find((ut) => ut.id === rule.unitTypeId)?.name ?? rule.unitTypeId}
                            </td>
                            <td style={{ padding: '11px 20px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                              €{(rule.amountMinor / 100).toFixed(2)}
                            </td>
                            <td style={{ padding: '11px 20px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
                              {rule.billingCycle.replace('_', ' ')}
                            </td>
                            {user.role === 'owner' && pb.status === 'draft' && (
                              <td style={{ padding: '11px 20px', textAlign: 'right' }}>
                                <PricingActions
                                  type="remove-rule"
                                  siteId={params.siteId}
                                  priceBookId={pb.id}
                                  rateRuleId={rule.id}
                                  unitTypes={unitTypes}
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {user.role === 'owner' && pb.status === 'draft' && (
                      <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                        <PricingActions
                          type="add-rule"
                          siteId={params.siteId}
                          priceBookId={pb.id}
                          unitTypes={unitTypes}
                        />
                      </div>
                    )}
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
