import Link from 'next/link';
import { PricingPlans } from './PricingPlans';
import { BrandLogo } from '@/components/brand-logo';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandLogo href="/" compact />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-600">Sign in</Link>
            <Link href="/register?plan=free" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg">Start free</Link>
          </div>
        </div>
      </header>
      <main className="px-6 py-14">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Pricing that grows with your storage business</h1>
          <p className="text-slate-500">Create your account first. Paid plans use secure Mollie checkout; SiteLager never stores card details.</p>
        </div>
        <PricingPlans />
      </main>
    </div>
  );
}
