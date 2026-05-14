import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';

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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Reports</h1>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Avg Occupancy</p>
          <p className="text-3xl font-bold text-slate-900">{avgOccupancy}%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Revenue (this month)</p>
          <p className="text-3xl font-bold text-slate-900">€{(totalRevenue / 100).toFixed(2)}</p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Occupancy by site</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Site</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Occupancy</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Units</th>
            </tr>
          </thead>
          <tbody>
            {occupancy.map((o, i) => (
              <tr key={o.siteId} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{o.siteId}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${o.occupancyPct}%` }} />
                    </div>
                    <span className="text-slate-700 font-medium text-sm">{o.occupancyPct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{o.occupiedUnits} / {o.totalUnits}</td>
              </tr>
            ))}
            {occupancy.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-400">No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
