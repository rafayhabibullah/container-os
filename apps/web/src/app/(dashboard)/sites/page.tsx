import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface SiteAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: SiteAddress;
}

export default async function SitesPage() {
  const user = await requireAuth();
  const sites = await serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Sites</h1>
          </div>
          {user.role === 'owner' && (
            <Link href="/sites/new" className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              + Add site
            </Link>
          )}
        </div>

        {sites.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500 mb-4">No sites yet.</p>
            {user.role === 'owner' && (
              <Link href="/sites/new" className="text-blue-600 hover:underline text-sm">Add your first site &rarr;</Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">City</th>
                  <th className="text-left px-6 py-3">Slug</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{site.name}</td>
                    <td className="px-6 py-4 text-slate-500">{site.address.city}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{site.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${site.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role === 'owner' && (
                        <Link href={`/sites/${site.id}`} className="text-blue-600 hover:underline">Edit</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
