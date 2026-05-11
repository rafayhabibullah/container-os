import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import SiteEditForm from './SiteEditForm';
import Link from 'next/link';

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
  currency: string;
}

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const site = await serverFetch<Site>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Sites</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">{site.name}</h1>
        <SiteEditForm site={site} />
      </div>
    </div>
  );
}
