import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface OccupancyItem { siteId: string; occupancyPct: number; totalUnits: number; occupiedUnits: number; }
interface RevenueItem { siteId: string; totalMinor: number; currency: string; }

export default async function ReportsPage() {
  const user = await requireAuth();
  const orgId = user.organisationId;

  const [occupancy, revenue] = await Promise.all([
    serverFetch<OccupancyItem[]>(`/v1/organisations/${orgId}/reports/occupancy`).catch(() => []),
    serverFetch<RevenueItem[]>(`/v1/organisations/${orgId}/reports/revenue`).catch(() => []),
  ]);

  const totalRevenue = revenue.reduce((sum, r) => sum + r.totalMinor, 0);
  const avgOccupancy = occupancy.length > 0
    ? Math.round(occupancy.reduce((sum, o) => sum + o.occupancyPct, 0) / occupancy.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Avg Occupancy</p>
            <p className="text-3xl font-bold text-slate-900">{avgOccupancy}%</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Revenue (this month)</p>
            <p className="text-3xl font-bold text-slate-900">€{(totalRevenue / 100).toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Occupancy by site</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Site ID</th>
                <th className="text-left px-6 py-3">Occupancy</th>
                <th className="text-left px-6 py-3">Occupied / Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {occupancy.map((o) => (
                <tr key={o.siteId} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{o.siteId}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${o.occupancyPct}%` }} />
                      </div>
                      <span className="text-slate-700 font-medium">{o.occupancyPct}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{o.occupiedUnits} / {o.totalUnits}</td>
                </tr>
              ))}
              {occupancy.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
