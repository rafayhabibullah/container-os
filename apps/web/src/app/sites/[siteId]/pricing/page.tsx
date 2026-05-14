import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import PricingActions from './PricingActions';
import Link from 'next/link';

interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface UnitType { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-600',
};

export default async function PricingPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const [priceBooks, unitTypes] = await Promise.all([
    serverFetch<PriceBook[]>(`/v1/organisations/${user.organisationId}/sites/${params.siteId}/price-books`).catch(() => []),
    serverFetch<UnitType[]>(`/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`).catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/sites/${params.siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Site</Link>
            <h1 className="text-2xl font-bold text-slate-900">Pricing</h1>
          </div>
          {user.role === 'owner' && (
            <PricingActions type="create-book" siteId={params.siteId} unitTypes={unitTypes} />
          )}
        </div>

        <div className="space-y-6">
          {priceBooks.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <p className="text-slate-500">No price books yet.</p>
            </div>
          )}
          {priceBooks.map((pb) => (
            <div key={pb.id} className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-800">{pb.name}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pb.status] ?? ''}`}>
                    {pb.status}
                  </span>
                  <span className="text-xs text-slate-400">from {new Date(pb.effectiveFrom).toLocaleDateString()}</span>
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
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-2">Unit type</th>
                    <th className="text-left px-6 py-2">Price / month</th>
                    <th className="text-left px-6 py-2">Billing cycle</th>
                    {user.role === 'owner' && pb.status === 'draft' && <th className="px-6 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pb.rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-700">
                        {unitTypes.find((ut) => ut.id === rule.unitTypeId)?.name ?? rule.unitTypeId}
                      </td>
                      <td className="px-6 py-3 text-slate-900 font-medium">
                        €{(rule.amountMinor / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-slate-500 capitalize">{rule.billingCycle.replace('_', ' ')}</td>
                      {user.role === 'owner' && pb.status === 'draft' && (
                        <td className="px-6 py-3 text-right">
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
                  {pb.rules.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-4 text-slate-400 text-center">No rate rules yet.</td></tr>
                  )}
                </tbody>
              </table>
              {user.role === 'owner' && pb.status === 'draft' && (
                <div className="px-6 py-4 border-t border-slate-100">
                  <PricingActions
                    type="add-rule"
                    siteId={params.siteId}
                    priceBookId={pb.id}
                    unitTypes={unitTypes}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
