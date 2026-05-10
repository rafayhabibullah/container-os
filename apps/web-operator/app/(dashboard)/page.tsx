const kpis = [
  { label: 'New Leads', value: 3, icon: '👤', color: 'blue' },
  { label: 'Open Incidents', value: 1, icon: '⚠️', color: 'red' },
  { label: 'Overdue Invoices', value: 2, icon: '💸', color: 'amber' },
  { label: 'Pending Reservations', value: 5, icon: '📋', color: 'green' },
];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  green: 'bg-green-50 text-green-700 border-green-100',
};

export default function TodayPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Today</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-5 ${colorMap[kpi.color]}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{kpi.icon}</span>
              <span className="text-3xl font-bold">{kpi.value}</span>
            </div>
            <p className="text-sm font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Queue</h2>
        <p className="text-sm text-gray-400 text-center py-8">No urgent items pending.</p>
      </div>
    </div>
  );
}
