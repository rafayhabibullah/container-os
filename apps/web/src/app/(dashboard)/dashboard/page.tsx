import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Building2, Users } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const [sites, members] = await Promise.all([
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(
      () => [] as Site[],
    ),
    serverFetch<{ id: string }[]>(
      `/v1/organisations/${user.organisationId}/members`,
    ).catch(() => []),
  ]);

  const stats = [
    {
      label: 'TOTAL SITES',
      value: sites.length,
      icon: Building2,
      href: '/sites',
      highlight: false,
    },
    {
      label: 'TEAM MEMBERS',
      value: members.length,
      icon: Users,
      href: '/team',
      highlight: false,
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
          <span className="text-white text-xs font-semibold uppercase">
            {user.role?.[0] ?? 'U'}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-xl p-5 border transition-shadow hover:shadow-md ${
              stat.highlight
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <p
              className={`text-xs font-semibold tracking-wide mb-2 ${
                stat.highlight ? 'text-blue-200' : 'text-slate-400'
              }`}
            >
              {stat.label}
            </p>
            <p
              className={`text-3xl font-bold ${
                stat.highlight ? 'text-white' : 'text-slate-900'
              }`}
            >
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent sites preview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Sites</h2>
          <Link
            href="/sites"
            className="text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            View all →
          </Link>
        </div>
        {sites.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">
            No sites yet.{' '}
            <Link href="/sites/new" className="text-blue-600 hover:underline">
              Add your first site →
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {sites.slice(0, 5).map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-blue-50/30 transition-colors"
              >
                <span className="text-sm text-slate-700 font-medium">
                  {site.name}
                </span>
                <Link
                  href={`/sites/${site.id}`}
                  className="text-sm text-blue-600 font-medium hover:text-blue-700"
                >
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
