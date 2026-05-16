import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import SiteEditForm from './SiteEditForm';
import Link from 'next/link';

interface Site {
  id: string; name: string; slug: string; status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string; currency: string;
}

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const site = await serverFetch<Site>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}`,
  );

  const navLinks = [
    { label: 'Units',      href: `/sites/${params.siteId}/units`,      desc: 'Manage individual storage units' },
    { label: 'Unit Types', href: `/sites/${params.siteId}/unit-types`, desc: 'Define sizes and features'       },
    { label: 'Pricing',    href: `/sites/${params.siteId}/pricing`,    desc: 'Price books and rate rules'      },
  ];

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .site-nav-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.10) !important; }
        .site-nav-card:hover .site-nav-label { color: #0f172a !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          <Link href="/sites" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            ← Sites
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {site.name}
          </h1>

          {/* Nav cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="site-nav-card"
                style={{
                  display: 'block',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                  padding: '16px',
                  textDecoration: 'none',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <p className="site-nav-label" style={{ fontSize: '14px', fontWeight: 700, color: '#475569', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'color 0.12s' }}>
                  {link.label}
                </p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {link.desc}
                </p>
              </Link>
            ))}
          </div>

          <SiteEditForm site={site} />
        </div>
      </div>
    </>
  );
}
