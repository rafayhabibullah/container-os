'use client';
import { useState } from 'react';

export default function ExportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/operator/v1/exports/datev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteIds: ['site_01', 'site_02'], from, to }),
      });
      const data = await res.json();
      setDownloadUrl(data.downloadUrl);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">DATEV Export</h1>
        <p className="text-sm text-gray-500 mt-0.5">Generate accounting export for your accountant</p>
      </div>
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Export booking journal</h2>
        <div className="space-y-4">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button
            onClick={handleExport}
            disabled={loading || !from || !to}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating…' : 'Start export'}
          </button>
          {downloadUrl && (
            <a href={downloadUrl} download className="block text-center text-sm text-blue-600 underline hover:text-blue-800">
              Download CSV
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
