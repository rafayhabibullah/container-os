const fmt = (minor: number) => new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);

async function getPortfolio() {
  return {
    sites: [
      { id: 'site_01', name: 'Passau Hafen', occupancyPct: 87.5, revenueMinor: 1234500, overdueCount: 2, unitCount: 46 },
      { id: 'site_02', name: 'München Nord', occupancyPct: 92.1, revenueMinor: 980000, overdueCount: 0, unitCount: 46 },
    ],
    totalRevenueMinor: 2214500,
    avgOccupancyPct: 89.8,
  };
}

export default async function OwnerDashboard() {
  const data = await getPortfolio();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Portfolio overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">All sites · Current month</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Avg occupancy', value: `${data.avgOccupancyPct.toFixed(1)}%`, sub: 'across both sites', color: 'blue' },
          { label: 'Revenue (month)', value: fmt(data.totalRevenueMinor), sub: 'paid invoices', color: 'green' },
          { label: 'Active sites', value: '2', sub: '92 units total', color: 'gray' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Site table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Site comparison</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3 text-right">Occupancy</th>
              <th className="px-5 py-3 text-right">Revenue</th>
              <th className="px-5 py-3 text-right">Units</th>
              <th className="px-5 py-3 text-right">Overdue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.sites.map((site) => (
              <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 font-medium text-gray-900">{site.name}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${site.occupancyPct}%` }} />
                    </div>
                    <span className="text-gray-700 font-medium">{site.occupancyPct}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right text-gray-700 font-medium">{fmt(site.revenueMinor)}</td>
                <td className="px-5 py-4 text-right text-gray-500">{site.unitCount}</td>
                <td className="px-5 py-4 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${site.overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {site.overdueCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
