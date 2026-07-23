import Link from 'next/link';
import { Filter, MapPin, Ruler, Search, ShieldCheck, SlidersHorizontal, Star, Zap } from 'lucide-react';
import { getT } from '@/lib/get-locale';
import { getCurrentTenantUser, getCurrentUser } from '@/lib/auth';
import { backendApi } from '@/lib/backend-url';
import { SavedSearchForm, TrackMarketplaceEvent } from './MarketplaceActions';
import { BrandLogo } from '@/components/brand-logo';

interface ListingSearchResult {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  publicPriceMinor: number | null;
  showPrice: boolean;
  depositMinor: number | null;
  images: string[];
  requiredDocs: string[];
  ratingAverage: number | null;
  reviewCount: number;
  distanceKm?: number | null;
  site: { id: string; name: string; slug: string; latitude?: number | null; longitude?: number | null; address: { street?: string; city?: string; postalCode?: string; country?: string }; accessHours?: unknown };
  organisation: { legalName: string; tradingName: string | null; countryCode: string };
  unit: { id: string; kind: string; driveUp: boolean; unitType: { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[] } };
}

export const metadata = {
  title: 'Storage finden | SiteLager',
  description: 'Container- und Self-Storage-Angebote vergleichen, Preise prüfen und online reservieren.',
};

function money(minor: number | null | undefined) {
  if (minor == null) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

function append(params: URLSearchParams, key: string, value?: string) {
  if (value) params.set(key, value);
}

export default async function StoragePage({
  searchParams,
}: {
  searchParams: { q?: string; city?: string; country?: string; minSize?: string; maxSize?: string; minPrice?: string; maxPrice?: string; mode?: string; feature?: string; sort?: string; lat?: string; lng?: string; radiusKm?: string };
}) {
  const t = getT();
  const user = getCurrentUser();
  const tenantUser = getCurrentTenantUser();
  const accountHref = user ? '/dashboard' : tenantUser ? '/my-storage' : '/login';
  const params = new URLSearchParams();
  append(params, 'q', searchParams.q);
  append(params, 'city', searchParams.city);
  append(params, 'country', searchParams.country);
  append(params, 'minSizeSqm', searchParams.minSize);
  append(params, 'maxSizeSqm', searchParams.maxSize);
  append(params, 'minPriceMinor', searchParams.minPrice ? String(Number(searchParams.minPrice) * 100) : undefined);
  append(params, 'maxPriceMinor', searchParams.maxPrice ? String(Number(searchParams.maxPrice) * 100) : undefined);
  append(params, 'bookingMode', searchParams.mode);
  append(params, 'feature', searchParams.feature);
  append(params, 'sort', searchParams.sort);
  append(params, 'lat', searchParams.lat);
  append(params, 'lng', searchParams.lng);
  append(params, 'radiusKm', searchParams.radiusKm);
  params.set('limit', '60');

  const [listings, allListings] = await Promise.all([
    fetch(backendApi(`/public/v1/listings?${params.toString()}`), { cache: 'no-store' })
      .then(async (r) => Array.isArray(await r.clone().json().catch(() => [])) ? r.json() as Promise<ListingSearchResult[]> : [])
      .catch(() => [] as ListingSearchResult[]),
    fetch(backendApi('/public/v1/listings?limit=200'), { cache: 'no-store' })
      .then(async (r) => Array.isArray(await r.clone().json().catch(() => [])) ? r.json() as Promise<ListingSearchResult[]> : [])
      .catch(() => [] as ListingSearchResult[]),
  ]);

  const cities = Array.from(new Set(allListings.map((l) => l.site.address.city).filter(Boolean) as string[])).sort();
  const features = Array.from(new Set(allListings.flatMap((l) => l.unit.unitType.features))).slice(0, 8).sort();
  const highlightedCities = cities.slice(0, 8);
  const activeFilters = {
    minSize: searchParams.minSize,
    maxSize: searchParams.maxSize,
    minPrice: searchParams.minPrice,
    maxPrice: searchParams.maxPrice,
    mode: searchParams.mode,
    feature: searchParams.feature,
    sort: searchParams.sort,
    lat: searchParams.lat,
    lng: searchParams.lng,
    radiusKm: searchParams.radiusKm,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TrackMarketplaceEvent eventType="search" metadata={{ q: searchParams.q, city: searchParams.city, filters: activeFilters }} />
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <BrandLogo href="/" compact markClassName="h-8 w-8" />
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/for-operators" className="text-slate-500 hover:text-slate-900">Für Betreiber</Link>
            <Link href={accountHref} className="text-slate-600 hover:text-slate-900">{user || tenantUser ? t('storage.nav.myAccount') : t('storage.nav.signIn')}</Link>
          </nav>
        </div>
      </header>

      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 py-7">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">Lagerraum und Container vergleichen</h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl">Finden Sie verfügbare Self-Storage- und Containerflächen mit transparenten Preisen, Standortdetails und geprüften Betreibern.</p>
          <form method="GET" className="mt-5 grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-end">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Suche</span>
              <span className="mt-1 flex items-center gap-2 border border-slate-200 rounded-lg bg-white px-3 py-2.5">
                <Search className="w-4 h-4 text-slate-400" />
                <input name="q" defaultValue={searchParams.q} placeholder="Stadt, Postleitzahl, Container, 24/7..." className="w-full outline-none text-sm" />
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Stadt</span>
              <select name="city" defaultValue={searchParams.city ?? ''} className="mt-1 w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm">
                <option value="">Alle Städte</option>
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Sortierung</span>
              <select name="sort" defaultValue={searchParams.sort ?? ''} className="mt-1 w-full border border-slate-200 rounded-lg bg-white px-3 py-2.5 text-sm">
                <option value="">Empfohlen</option>
                <option value="distance">Entfernung</option>
                <option value="price_asc">Preis aufsteigend</option>
                <option value="price_desc">Preis absteigend</option>
              </select>
            </label>
            <button className="h-[42px] bg-blue-600 text-white rounded-lg px-5 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700">
              <Filter className="w-4 h-4" /> Suchen
            </button>
            <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
              <input name="minSize" defaultValue={searchParams.minSize} placeholder="Min. m²" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input name="maxSize" defaultValue={searchParams.maxSize} placeholder="Max. m²" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input name="minPrice" defaultValue={searchParams.minPrice} placeholder="Min. €/Monat" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input name="maxPrice" defaultValue={searchParams.maxPrice} placeholder="Max. €/Monat" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <select name="mode" defaultValue={searchParams.mode ?? ''} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Alle Buchungsarten</option>
                <option value="instant_booking">Sofort buchbar</option>
                <option value="approval_required">Anfrage</option>
              </select>
            </div>
            <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input name="lat" defaultValue={searchParams.lat} placeholder="Latitude, z.B. 52.5200" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input name="lng" defaultValue={searchParams.lng} placeholder="Longitude, z.B. 13.4050" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input name="radiusKm" defaultValue={searchParams.radiusKm} placeholder="Radius km" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </form>
          {features.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              {features.map((feature) => (
                <Link key={feature} href={`/storage?feature=${encodeURIComponent(feature)}`} className={`px-3 py-1 rounded-full border text-xs ${searchParams.feature === feature ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{feature}</Link>
              ))}
            </div>
          )}
          {highlightedCities.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">Beliebte Städte</span>
              {highlightedCities.map((city) => (
                <Link key={city} href={`/storage/city/${encodeURIComponent(city.toLowerCase())}`} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs hover:bg-slate-200">{city}</Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-5 py-7">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-sm font-semibold text-slate-900">{listings.length} Angebote gefunden</p>
            <p className="text-xs text-slate-500">Alle Preise und Verfügbarkeiten werden vom Betreiber gepflegt.</p>
          </div>
          <Link href="/storage/container-storage" className="text-sm text-blue-600 hover:underline">Container-Lager ansehen</Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-10 text-center">
            <p className="font-semibold text-slate-900">Keine passenden Angebote gefunden</p>
            <p className="text-sm text-slate-500 mt-1">Entfernen Sie Filter oder probieren Sie eine nahegelegene Stadt.</p>
            <Link href="/storage" className="inline-block mt-4 text-sm text-blue-600 hover:underline">Filter zurücksetzen</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {listings.map((listing) => (
                <Link key={listing.id} href={`/storage/${listing.slug}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all group">
                  <div className="h-44 bg-slate-100 relative">
                    {listing.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">SiteLager</div>
                    )}
                    <div className="absolute left-3 top-3 flex gap-2">
                      {listing.bookingMode === 'instant_booking' && <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-1 text-xs font-semibold flex items-center gap-1"><Zap className="w-3 h-3" /> Sofort</span>}
                      <span className="bg-white/90 text-slate-700 rounded-full px-2 py-1 text-xs font-semibold">Verifiziert</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h2 className="font-bold text-slate-950 group-hover:text-blue-600">{listing.title}</h2>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {listing.site.address.postalCode} {listing.site.address.city}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="border border-slate-200 rounded-full px-2 py-1 flex items-center gap-1"><Ruler className="w-3 h-3" /> {listing.unit.unitType.sizeSqm} m²</span>
                      {listing.unit.driveUp && <span className="border border-slate-200 rounded-full px-2 py-1">Drive-up</span>}
                      {listing.distanceKm != null && <span className="border border-blue-200 bg-blue-50 text-blue-700 rounded-full px-2 py-1">{listing.distanceKm} km</span>}
                      {listing.ratingAverage && <span className="border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-2 py-1 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {listing.ratingAverage} ({listing.reviewCount})</span>}
                      {listing.unit.unitType.features.slice(0, 2).map((feature) => <span key={feature} className="border border-slate-200 rounded-full px-2 py-1">{feature}</span>)}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        {listing.showPrice && listing.publicPriceMinor != null ? (
                          <>
                            <p className="text-xl font-bold text-slate-950">{money(listing.publicPriceMinor)}<span className="text-xs font-medium text-slate-400"> / Monat</span></p>
                            {listing.depositMinor != null && <p className="text-xs text-slate-500">Kaution {money(listing.depositMinor)}</p>}
                          </>
                        ) : <p className="text-sm font-semibold text-slate-700">Preis auf Anfrage</p>}
                      </div>
                      <span className="text-sm font-semibold text-blue-600">Details</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <h2 className="font-bold text-slate-950">Standorte</h2>
                  <div className="mt-4 rounded-lg bg-slate-100 border border-slate-200 h-48 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,#e2e8f0_1px,transparent_1px),linear-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px]" />
                    {listings.slice(0, 7).map((listing, index) => (
                      <Link
                        key={listing.id}
                        href={`/storage/${listing.slug}`}
                        className="absolute w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-sm hover:bg-blue-700"
                        style={{ left: `${12 + (index * 29) % 72}%`, top: `${18 + (index * 19) % 58}%` }}
                        aria-label={listing.title}
                      >
                        {index + 1}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {listings.slice(0, 4).map((listing, index) => (
                      <Link key={listing.id} href={`/storage/${listing.slug}`} className="flex items-start gap-2 text-sm hover:text-blue-600">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold flex items-center justify-center">{index + 1}</span>
                        <span>{listing.site.address.postalCode} {listing.site.address.city}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                <SavedSearchForm city={searchParams.city} query={searchParams.q} filters={activeFilters} />
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <h2 className="font-bold text-slate-950">Warum über SiteLager?</h2>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-green-600 mt-0.5" /> Betreiberprofile und Angebote sind strukturiert geprüft.</li>
                    <li className="flex gap-2"><Zap className="w-4 h-4 text-blue-600 mt-0.5" /> Sofort buchbare Einheiten führen schneller zur Reservierung.</li>
                    <li className="flex gap-2"><MapPin className="w-4 h-4 text-slate-500 mt-0.5" /> Lokale Standorte mit transparenten Größen- und Preisangaben.</li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
