import Link from 'next/link';
import { Search, Filter } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface ListingSearchResult {
  id: string;
  title: string;
  slug: string;
  status: string;
  bookingMode: string;
  publicPriceMinor: number | null;
  showPrice: boolean;
  site: { name: string; slug: string; address: { city: string; country: string } };
  unit: { unitType: { sizeSqm: number; name: string } };
}

export default async function StoragePage({
  searchParams,
}: {
  searchParams: { city?: string; country?: string; minSize?: string; maxSize?: string; mode?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.city) params.set('city', searchParams.city);
  if (searchParams.country) params.set('country', searchParams.country);
  if (searchParams.minSize) params.set('minSizeSqm', searchParams.minSize);
  if (searchParams.maxSize) params.set('maxSizeSqm', searchParams.maxSize);
  if (searchParams.mode) params.set('bookingMode', searchParams.mode);
  params.set('limit', '40');

  const listings = await fetch(`${API_URL}/public/v1/listings?${params.toString()}`, {
    cache: 'no-store',
  }).then((r) => r.json() as Promise<ListingSearchResult[]>).catch(() => [] as ListingSearchResult[]);

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
        <form method="GET" className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">City</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input name="city" type="text" defaultValue={searchParams.city}
                placeholder="Berlin, Hamburg…"
                className="text-sm outline-none flex-1 placeholder-slate-400" />
            </div>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">Min size (m²)</label>
            <input name="minSize" type="number" defaultValue={searchParams.minSize}
              placeholder="0"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">Max size (m²)</label>
            <input name="maxSize" type="number" defaultValue={searchParams.maxSize}
              placeholder="Any"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">Booking type</label>
            <select name="mode" defaultValue={searchParams.mode}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
              <option value="">Any</option>
              <option value="instant_booking">Instant booking</option>
              <option value="approval_required">Approval required</option>
            </select>
          </div>
          <button type="submit"
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </form>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-900">
            {listings.length} storage unit{listings.length !== 1 ? 's' : ''}
            {searchParams.city ? ` in ${searchParams.city}` : ' available'}
          </h1>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No storage units found. Try adjusting your filters.</p>
            <Link href="/storage" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Clear filters</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <Link key={listing.id}
                href={`/storage/${listing.site.slug}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 text-sm leading-tight">{listing.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{listing.site.address.city}</p>
                  </div>
                  {listing.bookingMode === 'instant_booking' && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full shrink-0">Instant</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{listing.unit.unitType.sizeSqm} m² · {listing.unit.unitType.name}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {listing.showPrice && listing.publicPriceMinor != null ? (
                      <span className="font-bold text-slate-900">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(listing.publicPriceMinor / 100)}
                        <span className="text-xs font-normal text-slate-400">/mo</span>
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Price on request</span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 font-medium group-hover:underline">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
