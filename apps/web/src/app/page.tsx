import Link from 'next/link';
import { Search, MapPin, Zap, Shield } from 'lucide-react';

const POPULAR_CITIES = [
  { name: 'Berlin', country: 'Germany' },
  { name: 'Hamburg', country: 'Germany' },
  { name: 'Munich', country: 'Germany' },
  { name: 'Cologne', country: 'Germany' },
  { name: 'Frankfurt', country: 'Germany' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Search', desc: 'Find storage near you by city, size, and price.' },
  { step: '2', title: 'Choose', desc: 'Compare units from multiple operators side by side.' },
  { step: '3', title: 'Book', desc: 'Request a booking or book instantly — online in minutes.' },
  { step: '4', title: 'Move in', desc: 'Receive your access details and move in on your chosen date.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900">SiteLager</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/storage" className="text-slate-600 hover:text-slate-900">Find storage</Link>
            <Link href="/for-operators" className="text-slate-600 hover:text-slate-900">For operators</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4">
            Find storage and container space near you
          </h1>
          <p className="text-lg text-slate-500 mb-8">
            Search, compare, and book self-storage across Europe — from local operators with real reviews.
          </p>
          <div className="flex gap-2 max-w-xl mx-auto">
            <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="City or postal code…"
                className="flex-1 text-sm outline-none placeholder-slate-400"
              />
            </div>
            <Link href="/storage"
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap">
              <Search className="w-4 h-4" /> Search
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            <Link href="/for-operators" className="hover:underline">List your storage site →</Link>
          </p>
        </div>
      </section>

      {/* Popular cities */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Popular locations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {POPULAR_CITIES.map((city) => (
              <Link key={city.name}
                href={`/storage?city=${city.name.toLowerCase()}`}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                <p className="font-semibold text-slate-900 group-hover:text-blue-600">{city.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{city.country}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For operators CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto bg-blue-600 rounded-2xl p-10 text-center text-white">
          <div className="flex justify-center gap-4 mb-4">
            <Zap className="w-6 h-6 opacity-80" />
            <Shield className="w-6 h-6 opacity-80" />
          </div>
          <h2 className="text-2xl font-bold mb-3">The operating system for modern storage sites.</h2>
          <p className="text-blue-100 mb-6 text-sm max-w-lg mx-auto">
            Manage sites, tenants, contracts, invoices, and payments from one platform.
            Publish to the marketplace with 0% commission during launch.
          </p>
          <Link href="/for-operators"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50">
            Explore for operators →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-6 justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-slate-900">SiteLager</span>
          </div>
          <div className="flex gap-6">
            <Link href="/for-operators" className="hover:text-slate-700">For operators</Link>
            <Link href="/pricing" className="hover:text-slate-700">Pricing</Link>
            <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
