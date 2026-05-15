import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-bold text-slate-900">SiteLager</Link>
          <Link href="/legal/privacy" className="text-sm text-slate-500 hover:text-slate-700">Privacy Policy</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: May 2026</p>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Acceptance of terms</h2>
            <p>By creating a SiteLager account or using the marketplace as a visitor, you agree to these Terms of Service. If you are using SiteLager on behalf of a business, you represent that you have authority to bind that business to these terms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Service description</h2>
            <p>SiteLager provides a SaaS platform for storage operators ("Organisations") to manage sites, units, tenants, and billing, and a public marketplace where tenants can discover and book storage units.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Organisation responsibilities</h2>
            <p>Organisations are responsible for the accuracy of their listings, compliance with local law, and honoring bookings made through the marketplace. SiteLager is a platform and not a party to the storage rental contract between Organisation and Tenant.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Marketplace commission</h2>
            <p>At launch, marketplace commission is 0%. Future commission rates will be communicated to Organisations at least 30 days in advance.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Payments</h2>
            <p>SaaS subscription fees are billed monthly in advance. Failure to pay may result in account suspension. Tenant payments pass through the Organisation's connected payment account.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Governing law</h2>
            <p>These terms are governed by the laws of the European Union and the country in which SiteLager's operating entity is registered. Disputes will be resolved in the competent courts of that jurisdiction.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
