import Link from 'next/link';

const PLANS = [
  {
    name: 'Starter',
    price: '€49',
    period: '/month',
    tagline: 'For small operators',
    features: ['1 site', 'Up to 50 units', 'Marketplace listing', 'Basic invoices & contracts', 'Email notifications'],
    extraUnits: '€0.50/extra unit',
    cta: 'Get started',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '€99',
    period: '/month',
    tagline: 'For active operators',
    features: ['2 sites', 'Up to 150 units', 'Instant booking', 'Recurring billing + dunning', 'Manager & operator roles', 'Reporting & tenant portal'],
    extraUnits: '€0.40/extra unit',
    cta: 'Start with Growth',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '€199',
    period: '/month',
    tagline: 'For multi-site operators',
    features: ['5 sites', 'Up to 500 units', 'Advanced reports', 'Multi-language contracts', 'API & webhooks', 'Priority support'],
    extraUnits: '€0.30/extra unit',
    cta: 'Contact us',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900">SiteLager</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="py-16 px-6 bg-slate-50 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-slate-500">
            All plans include marketplace listing at <strong className="text-green-600">0% commission</strong> during launch.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${plan.highlight ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-slate-200 bg-white'}`}>
              {plan.highlight && (
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Most popular</div>
              )}
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="text-sm text-slate-500 mb-4">{plan.tagline}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-green-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mb-4">{plan.extraUnits}/month</p>
              <Link href="/register"
                className={`block text-center font-semibold py-3 rounded-xl ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10 px-6 text-center text-sm text-slate-400">
        <Link href="/legal/terms" className="hover:text-slate-700 mr-4">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
      </footer>
    </div>
  );
}
