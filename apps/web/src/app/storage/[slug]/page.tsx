import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getT, getLocale } from '@/lib/get-locale';
import { getCurrentUser, getCurrentTenantUser } from '@/lib/auth';
import { ImageCarousel } from './ImageCarousel';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

interface SiteAddress { street: string; city: string; postalCode: string; country: string; }
interface Site { id: string; name: string; slug: string; address: SiteAddress; }
interface AvailabilityItem {
  unitTypeId: string; unitTypeName: string; sizeSqm: number;
  availableCount: number; earliestAvailable: string | null;
}
interface ListingWithImages {
  images: string[];
  site: { slug: string };
}

export default async function StorageSiteDetailPage({ params }: { params: { slug: string } }) {
  const t = getT();
  const locale = getLocale();
  const user = getCurrentUser();
  const tenantUser = getCurrentTenantUser();
  const accountHref = user ? '/dashboard' : tenantUser ? '/my-storage' : '/login';
  const sites = await serverFetch<Site[]>('/public/v1/sites').catch(() => []);
  const site = sites.find((s) => s.slug === params.slug);
  if (!site) notFound();

  const availability = await serverFetch<AvailabilityItem[]>(
    `/public/v1/sites/${params.slug}/availability`,
  ).catch(() => []);

  const listings = await fetch(`${API_URL}/public/v1/listings?limit=200`, { cache: 'no-store' })
    .then(async (r) => { const d = await r.json(); return Array.isArray(d) ? (d as ListingWithImages[]) : []; })
    .catch(() => [] as ListingWithImages[]);
  const images = listings.filter((l) => l.site.slug === params.slug).flatMap((l) => l.images);

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
          <Link href={accountHref} className="text-sm text-slate-600 hover:text-slate-900">
            {user || tenantUser ? t('storage.nav.myAccount') : t('storage.nav.signIn')}
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link href="/storage" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">{t('storage.detail.allSites')}</Link>
        <ImageCarousel images={images} alt={site.name} />
        <h1 className="text-lg font-bold text-slate-900 mb-0.5">{site.name}</h1>
        <p className="text-sm text-slate-500 mb-6">
          {site.address.street}, {site.address.postalCode} {site.address.city}
        </p>

        <h2 className="text-sm font-semibold text-slate-700 mb-3">{t('storage.detail.availableStorage')}</h2>

        {availability.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">{t('storage.detail.noUnitsAvailable')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {availability.map((item) => (
              <div key={item.unitTypeId} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1">{item.unitTypeName}</h3>
                <p className="text-xs text-slate-400 mb-3">{item.sizeSqm} m²</p>
                <p className="text-xs text-slate-500">
                  <strong className="text-slate-700">{item.availableCount}</strong> {t(item.availableCount !== 1 ? 'storage.detail.unitsAvailablePlural' : 'storage.detail.unitsAvailableSingular')}
                </p>
                {item.earliestAvailable && (
                  <p className="text-slate-400 text-xs mt-1">
                    {t('storage.detail.earliest', { date: new Date(item.earliestAvailable).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US') })}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Link
                    href={`/storage/${params.slug}/book?siteId=${site.id}&unitTypes=${encodeURIComponent(JSON.stringify([{ id: item.unitTypeId, name: item.unitTypeName, sizeSqm: item.sizeSqm, features: [] }]))}`}
                    className="block text-center bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700">
                    {t('storage.detail.reserveUnit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-1">{t('storage.detail.requestQuote')}</h2>
          <p className="text-slate-500 text-xs mb-3">{t('storage.detail.requestQuoteDesc')}</p>
          <Link href={`/register`} className="text-sm text-blue-600 hover:underline">
            {t('storage.detail.createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
}
