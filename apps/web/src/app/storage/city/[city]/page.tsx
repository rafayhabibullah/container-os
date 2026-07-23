import Link from 'next/link';
import { MapPin, Ruler, Star, Zap } from 'lucide-react';
import { backendApi } from '@/lib/backend-url';
import { SavedSearchForm, TrackMarketplaceEvent } from '../../MarketplaceActions';

interface ListingSearchResult {
  id: string;
  title: string;
  slug: string;
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  publicPriceMinor: number | null;
  showPrice: boolean;
  ratingAverage: number | null;
  reviewCount: number;
  images: string[];
  site: { address: { city?: string; postalCode?: string } };
  unit: { driveUp: boolean; unitType: { sizeSqm: number; features: string[] } };
}

function titleCity(raw: string) {
  return decodeURIComponent(raw).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(minor: number | null | undefined) {
  if (minor == null) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

async function getListings(city: string): Promise<ListingSearchResult[]> {
  const params = new URLSearchParams({ city, limit: '60' });
  const res = await fetch(backendApi(`/public/v1/listings?${params.toString()}`), { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

export async function generateMetadata({ params }: { params: { city: string } }) {
  const city = titleCity(params.city);
  return {
    title: `Lagerraum in ${city} | SiteLager`,
    description: `Container und Self-Storage in ${city} vergleichen, Preise prüfen und online reservieren.`,
  };
}

export default async function CityStoragePage({ params }: { params: { city: string } }) {
  const city = titleCity(params.city);
  const listings = await getListings(city);

  return (
    <main className="min-h-screen bg-slate-50">
      <TrackMarketplaceEvent eventType="search" metadata={{ city, page: 'city' }} />
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-5 py-8">
          <Link href="/storage" className="text-sm text-slate-500 hover:text-slate-900">Alle Angebote</Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Lagerraum in {city}</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">Vergleichen Sie verfügbare Lagerflächen, Container und Self-Storage-Angebote mit lokalen Betreiberinformationen.</p>
          <div className="mt-5">
            <Link href={`/storage?city=${encodeURIComponent(city)}`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700">
              <MapPin className="w-4 h-4" /> Suche in {city} öffnen
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 py-7 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/storage/${listing.slug}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-40 bg-slate-100 relative">
                {listing.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                ) : <div className="w-full h-full flex items-center justify-center text-slate-400">SiteLager</div>}
                {listing.bookingMode === 'instant_booking' && <span className="absolute top-3 left-3 bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-1 text-xs font-semibold flex items-center gap-1"><Zap className="w-3 h-3" /> Sofort</span>}
              </div>
              <div className="p-4">
                <h2 className="font-bold text-slate-950">{listing.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{listing.site.address.postalCode} {listing.site.address.city}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="border border-slate-200 rounded-full px-2 py-1 flex items-center gap-1"><Ruler className="w-3 h-3" /> {listing.unit.unitType.sizeSqm} m²</span>
                  {listing.ratingAverage && <span className="border border-amber-200 bg-amber-50 text-amber-700 rounded-full px-2 py-1 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {listing.ratingAverage} ({listing.reviewCount})</span>}
                </div>
                <p className="mt-4 font-bold text-slate-950">{listing.showPrice && listing.publicPriceMinor != null ? `${money(listing.publicPriceMinor)} / Monat` : 'Preis auf Anfrage'}</p>
              </div>
            </Link>
          ))}
          {listings.length === 0 && (
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-8">
              <p className="font-semibold text-slate-950">Noch keine Angebote in {city}</p>
              <p className="text-sm text-slate-500 mt-1">Speichern Sie die Suche, dann können neue passende Angebote später gemeldet werden.</p>
            </div>
          )}
        </section>
        <aside>
          <SavedSearchForm city={city} filters={{ city }} />
        </aside>
      </div>
    </main>
  );
}
