import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireAuth();

  const [sites, members] = await Promise.all([
    serverFetch<{ id: string }[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => []),
    serverFetch<{ id: string }[]>(`/v1/organisations/${user.organisationId}/members`).catch(() => []),
  ]);

  const cards = [
    {
      label: 'Sites',
      count: sites.length,
      href: '/sites',
      cta: user.role === 'owner' ? 'Manage sites →' : 'View sites →',
    },
    {
      label: 'Team',
      count: members.length,
      href: '/team',
      cta: 'Manage team →',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            {user.role === 'owner' && (
              <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">
                Settings
              </Link>
            )}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <p className="text-slate-600 text-sm">
            Signed in as <strong>{user.role}</strong> ·{' '}
            Organisation{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">{user.organisationId}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link key={card.label} href={card.href}
              className="bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow group">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-slate-900 mb-2">{card.count}</p>
              <p className="text-blue-600 text-sm group-hover:underline">{card.cta}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
