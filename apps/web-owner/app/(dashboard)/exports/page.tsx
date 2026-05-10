'use client';
import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

export default function ExportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/operator/v1/exports/datev`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteIds: ['site_01', 'site_02'], from, to }) });
      const data = await res.json();
      setDownloadUrl(data.downloadUrl);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">DATEV-Export</h1>
      <Card className="max-w-md">
        <CardHeader><CardTitle>Buchungsstapel exportieren</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Von</label><input type="date" className="w-full border rounded px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">Bis</label><input type="date" className="w-full border rounded px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button className="w-full" onClick={handleExport} disabled={loading || !from || !to}>{loading ? 'Exportiere...' : 'Export starten'}</Button>
          {downloadUrl && <a href={downloadUrl} download className="block text-center text-blue-600 text-sm underline mt-2">CSV herunterladen</a>}
        </CardContent>
      </Card>
    </div>
  );
}
