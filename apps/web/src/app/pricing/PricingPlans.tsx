'use client';

import Link from 'next/link';
import { useState } from 'react';

const PLANS = [
  { id: 'free', name: 'Free', monthly: 0, tagline: 'Try SiteLager with a real site', features: ['1 site', 'Up to 10 units', 'Marketplace listing', 'Basic contracts'], extra: 'No card required' },
  { id: 'starter', name: 'Starter', monthly: 49, tagline: 'For small storage operators', features: ['1 site', 'Up to 50 units', 'Invoices and contracts', 'Tenant portal', 'Email notifications'], extra: '€0.50 per extra unit' },
  { id: 'professional', name: 'Professional', monthly: 149, tagline: 'For growing multi-site teams', features: ['5 sites', 'Up to 500 units', 'Recurring billing and dunning', 'Tasks, incidents and inspections', 'Reports, API and webhooks'], extra: '€0.30 per extra unit', highlight: true },
  { id: 'enterprise', name: 'Enterprise', monthly: 399, tagline: 'For large operators', features: ['Up to 100 sites', 'Up to 100,000 units', 'Platform operations', 'Priority support', 'Advanced integrations'], extra: 'Talk to us for custom terms' },
];

export function PricingPlans() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  return (
    <>
      <div className="flex justify-center mb-10">
        <div className="inline-flex border border-slate-200 rounded-lg p-1 bg-white">
          <button onClick={() => setInterval('monthly')} className={`px-4 py-2 text-sm rounded-md ${interval === 'monthly' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>Monthly</button>
          <button onClick={() => setInterval('yearly')} className={`px-4 py-2 text-sm rounded-md ${interval === 'yearly' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>Yearly · 2 months free</button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map((plan) => {
          const billed = interval === 'yearly' ? plan.monthly * 10 : plan.monthly;
          return (
            <div key={plan.id} className={`border p-6 flex flex-col rounded-lg ${plan.highlight ? 'border-blue-500 shadow-lg' : 'border-slate-200 bg-white'}`}>
              {plan.highlight && <div className="text-xs font-semibold text-blue-600 uppercase mb-3">Most popular</div>}
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="text-sm text-slate-500 mb-4">{plan.tagline}</p>
              <div className="mb-1"><span className="text-3xl font-bold text-slate-900">€{billed}</span><span className="text-slate-400 text-sm">/{interval === 'yearly' ? 'year' : 'month'}</span></div>
              {interval === 'yearly' && plan.monthly > 0 && <p className="text-xs text-green-700 mb-5">Save €{plan.monthly * 2} each year</p>}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => <li key={feature} className="text-sm text-slate-600">✓ {feature}</li>)}
              </ul>
              <p className="text-xs text-slate-400 mb-4">{plan.extra}</p>
              <Link href={`/register?plan=${plan.id}&interval=${interval}`} className={`block text-center font-semibold py-3 rounded-lg ${plan.highlight ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700'}`}>
                {plan.id === 'free' ? 'Start free' : `Choose ${plan.name}`}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
