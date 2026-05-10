import { Badge, Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

const fmtEuro = (minor: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);

async function getPortfolioData() {
  return {
    sites: [
      { id: 'site_01', name: 'Passau Hafen', occupancyPct: 87.5, revenueMinor: 1234500, overdueCount: 2 },
      { id: 'site_02', name: 'München Nord', occupancyPct: 92.1, revenueMinor: 980000, overdueCount: 0 },
    ],
    totalRevenueMinor: 2214500, avgOccupancyPct: 89.8,
  };
}

export default async function OwnerDashboard() {
  const data = await getPortfolioData();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Portfolio-Übersicht</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{data.avgOccupancyPct.toFixed(1)}%</div><p className="text-sm text-gray-500 mt-1">Durchschn. Belegung</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{fmtEuro(data.totalRevenueMinor)}</div><p className="text-sm text-gray-500 mt-1">Umsatz (Monat)</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{data.sites.length}</div><p className="text-sm text-gray-500 mt-1">Standorte</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Standortvergleich</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500"><th className="text-left py-2">Standort</th><th className="text-right py-2">Belegung</th><th className="text-right py-2">Umsatz</th><th className="text-right py-2">Überfällig</th></tr></thead>
            <tbody>
              {data.sites.map((site) => (
                <tr key={site.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{site.name}</td>
                  <td className="py-3 text-right">{site.occupancyPct}%</td>
                  <td className="py-3 text-right">{fmtEuro(site.revenueMinor)}</td>
                  <td className="py-3 text-right"><Badge variant={site.overdueCount > 0 ? 'warning' : 'success'}>{site.overdueCount}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
