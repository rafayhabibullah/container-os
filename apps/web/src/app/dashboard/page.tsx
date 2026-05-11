import { requireAuth } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <p className="text-slate-600 text-sm">
            Signed in as <strong>{user.role}</strong> ·{' '}
            Organisation{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">{user.organisationId}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['Sites', 'Units', 'Team'] as const).map((label) => (
            <div key={label} className="bg-white rounded-xl shadow p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
              <p className="text-slate-500 text-sm">Coming in Plan 2</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
