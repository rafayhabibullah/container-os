'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ExportResult {
  jobId: string;
  downloadUrl: string;
}

export default function DatevExportPage() {
  const [siteIds, setSiteIds] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/billing/export-datev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteIds: siteIds.split(',').map((s) => s.trim()).filter(Boolean),
          from,
          to,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? `Export failed: ${res.status}`);
        return;
      }
      const data: ExportResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-xl mx-auto">
        <Link href="/invoices" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Invoices
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Export to DATEV</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site IDs (comma-separated)
            </label>
            <input
              type="text"
              value={siteIds}
              onChange={(e) => setSiteIds(e.target.value)}
              placeholder="site_abc, site_xyz"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-700 text-white font-semibold text-sm py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Generating export…' : 'Export CSV'}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm">
            <p className="font-semibold mb-2">Export complete!</p>
            <p className="text-xs text-green-600 font-mono mb-3">Job ID: {result.jobId}</p>
            <a
              href={result.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-800"
            >
              Download DATEV CSV
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
