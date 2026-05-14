import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface SiteAddress { city: string; country: string; street: string; postalCode: string; }
interface Site { id: string; name: string; slug: string; address: SiteAddress; status: string; }

export default async function StoragePage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const sites = await serverFetch<Site[]>('/public/v1/sites').catch(() => []);
  const city = searchParams.city?.toLowerCase() ?? '';
  const filtered = city
    ? sites.filter((s) => s.address.city.toLowerCase().includes(city))
    : sites;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Find Storage</h1>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">Sign in</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <form method="GET" className="mb-8">
          <div className="flex gap-2">
            <input
              name="city"
              type="text"
              defaultValue={searchParams.city}
              placeholder="Search by city…"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700">
              Search
            </button>
          </div>
        </form>

        {filtered.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No storage sites found{city ? ` in "${city}"` : ''}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((site) => (
              <Link key={site.id} href={`/storage/${site.slug}`}
                className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group">
                <h2 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600">{site.name}</h2>
                <p className="text-slate-500 text-sm">{site.address.street}</p>
                <p className="text-slate-500 text-sm">{site.address.postalCode} {site.address.city}</p>
                <p className="text-blue-600 text-sm mt-3 group-hover:underline">View availability →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
