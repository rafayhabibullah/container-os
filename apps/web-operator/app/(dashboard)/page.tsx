import { Badge, Card, CardContent } from '@container-os/ui';

async function getQueueData() {
  return { leads: 3, incidents: 1, overdueInvoices: 2, pendingReservations: 5 };
}

export default async function TodayPage() {
  const data = await getQueueData();
  const kpis = [
    { label: 'Neue Leads', value: data.leads, variant: 'default' as const },
    { label: 'Offene Vorfälle', value: data.incidents, variant: data.incidents > 0 ? 'destructive' as const : 'success' as const },
    { label: 'Überfällige Rechnungen', value: data.overdueInvoices, variant: data.overdueInvoices > 0 ? 'warning' as const : 'success' as const },
    { label: 'Reservierungen', value: data.pendingReservations, variant: 'default' as const },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Heute</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{kpi.value}</div>
              <Badge variant={kpi.variant} className="mt-2">{kpi.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
