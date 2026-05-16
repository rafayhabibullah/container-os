import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface SiteAddress { street: string; city: string; postalCode: string; country: string; }
interface Site { id: string; name: string; slug: string; address: SiteAddress; }
interface AvailabilityItem {
  unitTypeId: string; unitTypeName: string; sizeSqm: number;
  availableCount: number; earliestAvailable: string | null;
}

export default async function StorageSiteDetailPage({ params }: { params: { slug: string } }) {
  const sites = await serverFetch<Site[]>('/public/v1/sites').catch(() => []);
  const site = sites.find((s) => s.slug === params.slug);
  if (!site) notFound();

  const availability = await serverFetch<AvailabilityItem[]>(
    `/public/v1/sites/${params.slug}/availability`,
  ).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">SiteLager</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/storage" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; All sites</Link>
        <h1 className="text-lg font-bold text-slate-900 mb-0.5">{site.name}</h1>
        <p className="text-sm text-slate-500 mb-6">
          {site.address.street}, {site.address.postalCode} {site.address.city}
        </p>

        <h2 className="text-sm font-semibold text-slate-700 mb-3">Available storage</h2>

        {availability.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No units currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {availability.map((item) => (
              <div key={item.unitTypeId} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1">{item.unitTypeName}</h3>
                <p className="text-xs text-slate-400 mb-3">{item.sizeSqm} m²</p>
                <p className="text-xs text-slate-500">
                  <strong className="text-slate-700">{item.availableCount}</strong> unit{item.availableCount !== 1 ? 's' : ''} available
                </p>
                {item.earliestAvailable && (
                  <p className="text-slate-400 text-xs mt-1">
                    Earliest: {new Date(item.earliestAvailable).toLocaleDateString()}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Link
                    href={`/storage/${params.slug}/book?siteId=${site.id}&unitTypes=${encodeURIComponent(JSON.stringify([{ id: item.unitTypeId, name: item.unitTypeName, sizeSqm: item.sizeSqm, features: [] }]))}`}
                    className="block text-center bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700">
                    Reserve a unit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-1">Request a quote</h2>
          <p className="text-slate-500 text-xs mb-3">Have specific requirements? Send us a message.</p>
          <Link href={`/register`} className="text-sm text-blue-600 hover:underline">
            Create an account to get started →
          </Link>
        </div>
      </div>
    </div>
  );
}
