import Link from 'next/link';
import { getLocale } from '../lib/locale';
import { getMessages } from '../lib/messages';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function getSites() {
  try {
    const res = await fetch(`${API_URL}/public/v1/sites`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default async function HomePage() {
  const locale = getLocale();
  const m = getMessages(locale);
  const sites = await getSites();

  return (
    <div>
      {/* Hero */}
      <section className="mb-12 text-center py-12">
        <div className="mx-auto mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
          {m.home.badge}
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {m.home.headline1}<br />
          <span className="text-blue-600">{m.home.headline2}</span>
        </h1>
        <p className="mx-auto max-w-xl text-base text-gray-500">{m.home.sub}</p>
      </section>

      {/* Locations */}
      <section className="mb-12">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">{m.home.locationsTitle}</h2>
        <p className="mb-5 text-sm text-gray-500">{m.home.locationsSub}</p>
        {sites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
            {m.home.noLocations}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sites.map((site: any) => (
              <Link key={site.id} href={`/sites/${site.slug}`} className="group block">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-sm">
                      {site.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {locale === 'de' ? 'Verfügbar' : 'Available'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{site.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{site.address?.street}, {site.address?.city}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                    <span>🔒 {locale === 'de' ? '24/7 Zugang' : '24/7 access'}</span>
                    <span>🚗 Drive-up</span>
                    <span>📦 {locale === 'de' ? 'Flexibel' : 'Flexible'}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="text-sm">
                      <span className="text-xs text-gray-400">{m.home.from} </span>
                      <span className="font-semibold text-blue-700">€49 {m.home.perMonth}</span>
                    </div>
                    <span className="text-xs font-medium text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      {m.home.checkAvailability}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="rounded-xl bg-white border border-gray-200 p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-400">{m.home.whyTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {m.home.features.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
