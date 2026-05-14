import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface SiteAddress {
  city: string;
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
  const sites = await serverFetch<Site[]>(
    `/v1/organisations/${user.organisationId}/sites`,
  ).catch(() => [] as Site[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sites</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {sites.length} location{sites.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user.role === 'owner' && (
          <Link
            href="/sites/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Add site
          </Link>
        )}
      </div>

      {/* Search toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search sites…</span>
        </div>
      </div>

      {/* Table / empty state */}
      {sites.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400 mb-3">No sites yet.</p>
          {user.role === 'owner' && (
            <Link
              href="/sites/new"
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Add your first site →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  City
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Slug
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {sites.map((site, i) => (
                <tr
                  key={site.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {site.name}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {site.address?.city}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                    {site.slug}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={site.status === 'active' ? 'success' : 'outline'}>
                      {site.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/sites/${site.id}`}
                      className="text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {sites.length} of {sites.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
