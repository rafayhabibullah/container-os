import Link from 'next/link';
import { Search, Filter } from 'lucide-react';
import { getT } from '@/lib/get-locale';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

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
  searchParams: { q?: string; city?: string; country?: string; minSize?: string; maxSize?: string; mode?: string };
}) {
  const t = getT();
  const params = new URLSearchParams();
  if (searchParams.q) params.set('q', searchParams.q);
  if (searchParams.city) params.set('city', searchParams.city);
  if (searchParams.country) params.set('country', searchParams.country);
  if (searchParams.minSize) params.set('minSizeSqm', searchParams.minSize);
  if (searchParams.maxSize) params.set('maxSizeSqm', searchParams.maxSize);
  if (searchParams.mode) params.set('bookingMode', searchParams.mode);
  params.set('limit', '40');

  const [listings, allListings] = await Promise.all([
    fetch(`${API_URL}/public/v1/listings?${params.toString()}`, { cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); return Array.isArray(d) ? (d as ListingSearchResult[]) : []; })
      .catch(() => [] as ListingSearchResult[]),
    fetch(`${API_URL}/public/v1/listings?limit=200`, { cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); return Array.isArray(d) ? (d as ListingSearchResult[]) : []; })
      .catch(() => [] as ListingSearchResult[]),
  ]);

  const cities = Array.from(new Set(allListings.map((l) => l.site.address.city))).sort();

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
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">{t('storage.nav.signIn')}</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <form method="GET" className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">{t('storage.search.label')}</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input name="q" type="text" defaultValue={searchParams.q}
                placeholder={t('storage.search.placeholder')}
                className="text-sm outline-none flex-1 placeholder-slate-400" />
            </div>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">{t('storage.search.minSize')}</label>
            <input name="minSize" type="number" defaultValue={searchParams.minSize}
              placeholder="0"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">{t('storage.search.maxSize')}</label>
            <input name="maxSize" type="number" defaultValue={searchParams.maxSize}
              placeholder={t('storage.search.maxSizeAny')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">{t('storage.search.bookingType')}</label>
            <select name="mode" defaultValue={searchParams.mode}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
              <option value="">{t('storage.search.bookingTypeAny')}</option>
              <option value="instant_booking">{t('storage.search.instantBooking')}</option>
              <option value="approval_required">{t('storage.search.approvalRequired')}</option>
            </select>
          </div>
          <button type="submit"
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <Filter className="w-4 h-4" /> {t('storage.search.filter')}
          </button>
        </form>

        {cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {cities.map((city) => (
              <Link
                key={city}
                href={searchParams.city === city ? '/storage' : `/storage?city=${encodeURIComponent(city)}`}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  searchParams.city === city
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}>
                {city}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-900">
            {t(listings.length === 1 ? 'storage.results.countSingular' : 'storage.results.countPlural', { count: String(listings.length) })}
            {searchParams.city ? t('storage.results.inCity', { city: searchParams.city }) : t('storage.results.available')}
          </h1>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">{t('storage.results.noResults')}</p>
            <Link href="/storage" className="mt-4 inline-block text-sm text-blue-600 hover:underline">{t('storage.results.clearFilters')}</Link>
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
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full shrink-0">{t('storage.results.instantBadge')}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{listing.unit.unitType.sizeSqm} m² · {listing.unit.unitType.name}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {listing.showPrice && listing.publicPriceMinor != null ? (
                      <span className="font-bold text-slate-900">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(listing.publicPriceMinor / 100)}
                        <span className="text-xs font-normal text-slate-400">{t('storage.results.perMonth')}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">{t('storage.results.priceOnRequest')}</span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 font-medium group-hover:underline">{t('storage.results.view')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
