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

  const inputStyle: React.CSSProperties = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#0f172a',
    fontSize: '14px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '5px',
    letterSpacing: '0.03em',
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          <Link href="/invoices" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            ← Invoices
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', letterSpacing: '-0.02em' }}>
            Export to DATEV
          </h1>

          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '24px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={labelStyle}>Site IDs (comma-separated)</label>
                <input
                  type="text"
                  value={siteIds}
                  onChange={(e) => setSiteIds(e.target.value)}
                  placeholder="site_abc, site_xyz"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  width: '100%',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {loading ? 'Generating export…' : 'Export CSV'}
              </button>
            </form>
          </div>

          {error && (
            <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '12px 16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '10px', padding: '16px' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '14px' }}>Export complete!</p>
              <p style={{ margin: '0 0 14px', fontSize: '12px', fontFamily: 'monospace', color: '#16a34a' }}>Job ID: {result.jobId}</p>
              <a
                href={result.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}
              >
                Download DATEV CSV
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
