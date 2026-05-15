import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';

interface OrgProfile {
  id: string;
  legalName: string;
  plan: 'starter' | 'growth' | 'pro';
}

const PLAN_DETAILS: Record<string, { label: string; price: string; sites: number; units: number }> = {
  starter: { label: 'Starter', price: '€49/mo', sites: 1, units: 50 },
  growth: { label: 'Growth', price: '€99/mo', sites: 2, units: 150 },
  pro: { label: 'Pro', price: '€199/mo', sites: 5, units: 500 },
};

export default async function BillingPage() {
  const user = await requireAuth();
  const org = await serverFetch<OrgProfile>(`/v1/organisations/${user.organisationId}`).catch(() => null);

  const plan = org?.plan ?? 'starter';
  const details = PLAN_DETAILS[plan];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">SiteLager Billing</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your SiteLager subscription</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Current plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{details.label}</h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-slate-500 mt-1">{details.price}</p>
          </div>
          <button className="text-sm text-blue-600 font-semibold border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50">
            Upgrade plan
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Sites included</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{details.sites}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Units included</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{details.units}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Marketplace commission</p>
            <p className="text-lg font-bold text-green-600 mt-1">0%</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-900 text-sm">Available plans</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {Object.entries(PLAN_DETAILS).map(([key, p]) => (
            <div key={key} className={`px-6 py-4 flex items-center justify-between ${key === plan ? 'bg-blue-50' : ''}`}>
              <div>
                <span className="font-semibold text-slate-900">{p.label}</span>
                <span className="text-slate-500 text-sm ml-3">{p.sites} site{p.sites > 1 ? 's' : ''} · {p.units} units</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{p.price}</span>
                {key === plan
                  ? <Badge variant="success">Current</Badge>
                  : <button className="text-sm text-blue-600 font-medium hover:underline">Switch</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
