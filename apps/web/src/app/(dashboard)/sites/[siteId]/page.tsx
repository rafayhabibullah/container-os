import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import SiteDetailTabs from './SiteDetailTabs';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[]; }
interface Unit { id: string; unitCode: string; kind: string; status: string; driveUp: boolean; unitType: UnitType; }
interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface Site {
  id: string; name: string; slug: string; status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
}
interface SiteSummary { id: string; name: string; }

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const t = getT();
  const user = await requireAuth();
  const base = `/v1/organisations/${user.organisationId}`;

  const [site, unitTypes, units, priceBooks, allSites] = await Promise.all([
    serverFetch<Site>(`${base}/sites/${params.siteId}`),
    serverFetch<UnitType[]>(`${base}/sites/${params.siteId}/unit-types`).catch(() => [] as UnitType[]),
    serverFetch<Unit[]>(`${base}/sites/${params.siteId}/units`).catch(() => [] as Unit[]),
    serverFetch<PriceBook[]>(`${base}/sites/${params.siteId}/price-books`).catch(() => [] as PriceBook[]),
    serverFetch<SiteSummary[]>(`${base}/sites`).catch(() => [] as SiteSummary[]),
  ]);

  const otherSites = allSites.filter(s => s.id !== params.siteId);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <Link href="/sites" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            {t('dashboard.sites.detail.backToSites')}
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {site.name}
          </h1>

          <SiteDetailTabs
            site={site}
            unitTypes={unitTypes}
            units={units}
            priceBooks={priceBooks}
            otherSites={otherSites}
            userRole={user.role}
          />
        </div>
      </div>
    </>
  );
}
