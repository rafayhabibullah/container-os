import { requireAuth } from '@/lib/auth';

export default async function MyStoragePage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Storage</h1>
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-slate-500 text-sm">
            Active rentals, invoices, and access credentials will appear here (Plan 4).
          </p>
          <p className="mt-3 text-slate-400 text-xs">User ID: {user.sub}</p>
        </div>
      </div>
    </div>
  );
}
