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
      <header className="bg-white shadow-sm px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/storage" className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">&larr; All sites</Link>
          <h1 className="text-2xl font-bold text-slate-900">{site.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {site.address.street}, {site.address.postalCode} {site.address.city}
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Available storage</h2>

        {availability.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No units currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {availability.map((item) => (
              <div key={item.unitTypeId} className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-1">{item.unitTypeName}</h3>
                <p className="text-slate-500 text-sm mb-3">{item.sizeSqm} m²</p>
                <p className="text-slate-600 text-sm">
                  <strong>{item.availableCount}</strong> unit{item.availableCount !== 1 ? 's' : ''} available
                </p>
                {item.earliestAvailable && (
                  <p className="text-slate-400 text-xs mt-1">
                    Earliest: {new Date(item.earliestAvailable).toLocaleDateString()}
                  </p>
                )}
                <Link href={`/register`}
                  className="mt-4 block text-center bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700">
                  Reserve a unit
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-3">Request a quote</h2>
          <p className="text-slate-500 text-sm mb-4">Have specific requirements? Send us a message.</p>
          <Link href={`/register`} className="text-blue-600 hover:underline text-sm">
            Create an account to get started →
          </Link>
        </div>
      </div>
    </div>
  );
}
