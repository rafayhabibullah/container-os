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
    { label: 'Units', href: `/sites/${params.siteId}/units`, desc: 'Manage individual storage units' },
    { label: 'Unit Types', href: `/sites/${params.siteId}/unit-types`, desc: 'Define sizes and features' },
    { label: 'Pricing', href: `/sites/${params.siteId}/pricing`, desc: 'Price books and rate rules' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Sites</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{site.name}</h1>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href}
              className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow group">
              <p className="font-semibold text-slate-800 group-hover:text-blue-600 text-sm">{link.label}</p>
              <p className="text-slate-400 text-xs mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>

        <SiteEditForm site={site} />
      </div>
    </div>
  );
}
