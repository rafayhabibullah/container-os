'use client';

interface ExecutiveExport {
  kpis: Record<string, number>;
  sitePerformance: { siteName: string; occupancyPct: number; totalUnits: number; occupiedUnits: number; revenueMinor: number; overdueMinor: number }[];
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function ExecutiveExportButton({ report, label }: { report: ExecutiveExport; label: string }) {
  const download = () => {
    const rows: (string | number)[][] = [
      ['Metric', 'Value'],
      ...Object.entries(report.kpis),
      [],
      ['Site', 'Occupancy %', 'Occupied units', 'Total units', 'Revenue EUR', 'Overdue EUR'],
      ...report.sitePerformance.map((site) => [
        site.siteName,
        site.occupancyPct,
        site.occupiedUnits,
        site.totalUnits,
        (site.revenueMinor / 100).toFixed(2),
        (site.overdueMinor / 100).toFixed(2),
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sitelager-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" onClick={download} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
      {label}
    </button>
  );
}
