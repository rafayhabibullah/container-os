import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, FileText, MapPin, Ruler, ShieldCheck, Star, Truck, Zap } from 'lucide-react';
import { getCurrentTenantUser, getCurrentUser } from '@/lib/auth';
import { getT } from '@/lib/get-locale';
import { ImageCarousel } from './ImageCarousel';
import { ReviewForm, TrackMarketplaceEvent } from '../MarketplaceActions';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

interface ListingDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  publicPriceMinor: number | null;
  showPrice: boolean;
  depositMinor: number | null;
  requiredDocs: string[];
  images: string[];
  ratingAverage: number | null;
  reviewCount: number;
  marketplaceReviews?: { id: string; rating: number; title: string | null; body: string | null; reviewerName: string | null; createdAt: string }[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  site: { id: string; name: string; slug: string; address: { street?: string; postalCode?: string; city?: string; country?: string }; accessHours?: unknown; timezone: string; currency: string };
  organisation: { legalName: string; tradingName: string | null; countryCode: string };
  unit: { id: string; kind: string; driveUp: boolean; unitType: { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[] } };
}

function money(minor: number | null | undefined) {
  if (minor == null) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

async function getListing(slug: string): Promise<ListingDetail | null> {
  const res = await fetch(`${API_URL}/public/v1/listings/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function fallbackListingForSite(slug: string): Promise<ListingDetail | null> {
  const res = await fetch(`${API_URL}/public/v1/listings?limit=200`, { cache: 'no-store' });
  if (!res.ok) return null;
  const listings = await res.json().catch(() => []);
  return Array.isArray(listings) ? listings.find((listing) => listing.site?.slug === slug) ?? null : null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const listing = await getListing(params.slug).catch(() => null);
  return {
    title: listing?.seoTitle ?? listing?.title ?? 'Storage Angebot | SiteLager',
    description: listing?.seoDescription ?? listing?.description ?? 'Verfügbare Lagerfläche online prüfen und reservieren.',
  };
}

export default async function StorageListingDetailPage({ params }: { params: { slug: string } }) {
  const t = getT();
  const user = getCurrentUser();
  const tenantUser = getCurrentTenantUser();
  const accountHref = user ? '/dashboard' : tenantUser ? '/my-storage' : '/login';
  const listing = await getListing(params.slug).catch(() => null) ?? await fallbackListingForSite(params.slug).catch(() => null);
  if (!listing) notFound();

  const firstMonth = listing.publicPriceMinor ?? 0;
  const deposit = listing.depositMinor ?? 0;
  const dueToday = listing.showPrice ? firstMonth + deposit : null;
  const features = [
    `${listing.unit.unitType.sizeSqm} m²`,
    listing.unit.unitType.sizeCbm ? `${listing.unit.unitType.sizeCbm} m³` : null,
    listing.unit.unitType.doorType,
    listing.unit.driveUp ? 'Drive-up' : null,
    ...listing.unit.unitType.features,
  ].filter(Boolean) as string[];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: listing.images,
    offers: listing.showPrice && listing.publicPriceMinor != null ? {
      '@type': 'Offer',
      price: (listing.publicPriceMinor / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/storage/${listing.slug}`,
    } : undefined,
    areaServed: listing.site.address.city,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TrackMarketplaceEvent listingId={listing.id} eventType="listing_view" metadata={{ slug: listing.slug, city: listing.site.address.city }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center justify-center">S</span>
            <span className="font-bold text-slate-950 text-sm">SiteLager</span>
          </Link>
          <Link href={accountHref} className="text-sm text-slate-600 hover:text-slate-900">{user || tenantUser ? t('storage.nav.myAccount') : t('storage.nav.signIn')}</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-7">
        <Link href="/storage" className="text-sm text-slate-500 hover:text-slate-900">Alle Angebote</Link>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7 mt-5">
          <section>
            <ImageCarousel images={listing.images} alt={listing.title} />
            {listing.images.length === 0 && <div className="h-72 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500">SiteLager</div>}
            <div className="mt-6 bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {listing.bookingMode === 'instant_booking' && <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1"><Zap className="w-3 h-3" /> Sofort buchbar</span>}
                <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verifizierter Betreiber</span>
                {listing.ratingAverage && <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {listing.ratingAverage} aus {listing.reviewCount} Bewertungen</span>}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">{listing.title}</h1>
              <p className="mt-2 text-slate-500 flex items-center gap-1 text-sm"><MapPin className="w-4 h-4" /> {listing.site.address.street}, {listing.site.address.postalCode} {listing.site.address.city}</p>
              {listing.description && <p className="mt-5 text-sm leading-6 text-slate-600">{listing.description}</p>}

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border border-slate-200 rounded-lg p-3"><Ruler className="w-4 h-4 text-blue-600" /><p className="text-xs text-slate-500 mt-2">Größe</p><p className="font-semibold">{listing.unit.unitType.sizeSqm} m²</p></div>
                <div className="border border-slate-200 rounded-lg p-3"><Truck className="w-4 h-4 text-blue-600" /><p className="text-xs text-slate-500 mt-2">Zugang</p><p className="font-semibold">{listing.unit.driveUp ? 'Drive-up' : 'Standard'}</p></div>
                <div className="border border-slate-200 rounded-lg p-3"><Clock className="w-4 h-4 text-blue-600" /><p className="text-xs text-slate-500 mt-2">Verfügbarkeit</p><p className="font-semibold">Jetzt</p></div>
                <div className="border border-slate-200 rounded-lg p-3"><FileText className="w-4 h-4 text-blue-600" /><p className="text-xs text-slate-500 mt-2">Dokumente</p><p className="font-semibold">{listing.requiredDocs.length || 'Keine'}</p></div>
              </div>

              <h2 className="mt-7 font-bold text-slate-950">Ausstattung</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {features.map((feature) => <span key={feature} className="border border-slate-200 rounded-full px-3 py-1 text-sm text-slate-600">{feature}</span>)}
              </div>
            </div>
            <div className="mt-5 bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-950">Bewertungen</h2>
                  <p className="text-sm text-slate-500 mt-1">{listing.reviewCount ? `${listing.reviewCount} veröffentlichte Erfahrungen` : 'Noch keine Bewertungen für dieses Angebot.'}</p>
                </div>
                {listing.ratingAverage && <div className="flex items-center gap-1 text-amber-600 font-bold"><Star className="w-5 h-5 fill-amber-400 text-amber-400" /> {listing.ratingAverage}</div>}
              </div>
              {listing.marketplaceReviews && listing.marketplaceReviews.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {listing.marketplaceReviews.slice(0, 4).map((review) => (
                    <article key={review.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`w-3.5 h-3.5 ${index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}
                      </div>
                      {review.title && <p className="font-semibold text-sm text-slate-950 mt-2">{review.title}</p>}
                      {review.body && <p className="text-sm text-slate-600 mt-1 leading-5">{review.body}</p>}
                      <p className="text-xs text-slate-400 mt-3">{review.reviewerName ?? 'Mieter'}</p>
                    </article>
                  ))}
                </div>
              )}
              <ReviewForm listingId={listing.id} />
            </div>
          </section>

          <aside>
            <div className="sticky top-24 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <p className="text-sm text-slate-500">Preis</p>
              {listing.showPrice && listing.publicPriceMinor != null ? (
                <>
                  <p className="text-3xl font-bold text-slate-950 mt-1">{money(listing.publicPriceMinor)}<span className="text-sm font-medium text-slate-400"> / Monat</span></p>
                  <div className="mt-5 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Miete erster Monat</span><strong>{money(firstMonth)}</strong></div>
                    <div className="flex justify-between"><span>Kaution</span><strong>{money(deposit)}</strong></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2"><span>Heute fällig</span><strong>{money(dueToday)}</strong></div>
                  </div>
                </>
              ) : <p className="text-xl font-bold text-slate-950 mt-1">Preis auf Anfrage</p>}
              <Link
                href={`/storage/${listing.slug}/book?listingId=${listing.id}&listingSlug=${listing.slug}&siteId=${listing.site.id}&unitTypes=${encodeURIComponent(JSON.stringify([{ id: listing.unit.unitType.id, name: listing.unit.unitType.name, sizeSqm: listing.unit.unitType.sizeSqm, features: listing.unit.unitType.features }]))}`}
                className="mt-5 block w-full text-center bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700"
              >
                {listing.bookingMode === 'instant_booking' ? 'Jetzt buchen' : 'Verfügbarkeit anfragen'}
              </Link>
              <p className="mt-3 text-xs text-slate-500 text-center">Reservierung unverbindlich bis zur Bestätigung des Betreibers.</p>
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-950">{listing.organisation.tradingName ?? listing.organisation.legalName}</p>
                <p className="text-xs text-slate-500 mt-1">Betreiber dieses Standorts: {listing.site.name}</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
