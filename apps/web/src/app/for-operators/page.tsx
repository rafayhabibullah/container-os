import Link from 'next/link';
import { BarChart2, FileText, Users, Globe, Zap, Shield } from 'lucide-react';

const FEATURES = [
  { icon: Globe, title: 'Marketplace listing', desc: 'Publish your units to the SiteLager marketplace at 0% commission during launch.' },
  { icon: Users, title: 'Tenant management', desc: 'Full CRM for tenants — contracts, invoices, documents, and communication.' },
  { icon: FileText, title: 'Automated billing', desc: 'Monthly recurring invoices, SEPA mandates, dunning reminders, and lockout workflows.' },
  { icon: BarChart2, title: 'Reporting', desc: 'Occupancy rates, revenue tracking, and unit availability at a glance.' },
  { icon: Zap, title: 'Instant booking', desc: 'Let tenants book instantly online — or require manual approval for full control.' },
  { icon: Shield, title: 'Access control', desc: 'Issue and revoke access credentials per tenant, integrated with hardware vendors.' },
];

export default function ForOperatorsPage() {
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
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 px-6 bg-slate-50 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            The operating system for modern storage sites.
          </h1>
          <p className="text-lg text-slate-500 mb-8">
            Everything you need to run your storage business — sites, tenants, contracts, invoices, payments, and marketplace listings — in one platform built for European operators.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/register"
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700">
              Get started free
            </Link>
            <Link href="/pricing"
              className="border border-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl hover:bg-slate-50">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Everything in one place</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <f.icon className="w-6 h-6 text-blue-600 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-blue-600 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to modernise your storage operation?</h2>
        <p className="text-blue-100 mb-6 text-sm">No setup fees. Start with our Starter plan at €49/month.</p>
        <Link href="/register"
          className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50">
          Create your account →
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-6 justify-between text-sm text-slate-400">
          <Link href="/" className="font-semibold text-slate-900">← SiteLager</Link>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-slate-700">Pricing</Link>
            <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
