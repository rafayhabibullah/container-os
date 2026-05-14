'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Mandate {
  id: string;
  scheme: string;
  status: string;
  ibanLast4?: string;
  signedAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
  failed: 'bg-red-100 text-red-700',
};

export default function CustomerMandatesPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;

  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheme, setScheme] = useState('sepa_core');
  const [ibanLast4, setIbanLast4] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMandates() {
    setLoading(true);
    const res = await fetch(`/api/billing/mandates?customerId=${customerId}`).catch(() => null);
    if (res?.ok) {
      const data: Mandate[] = await res.json();
      setMandates(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadMandates(); }, [customerId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/mandates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, scheme, ibanLast4: ibanLast4 || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? 'Failed to create mandate');
        return;
      }
      setIbanLast4('');
      await loadMandates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment mandates</h1>
        <p className="text-slate-500 text-sm font-mono mb-8">Customer: {customerId}</p>

        {/* Mandate list */}
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : mandates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center text-slate-500 text-sm mb-6">
            No mandates yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Scheme</th>
                  <th className="text-left px-6 py-3">IBAN last 4</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mandates.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{m.scheme}</td>
                    <td className="px-6 py-3 font-mono text-slate-500">{m.ibanLast4 ?? '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[m.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add mandate form */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Add mandate</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scheme</label>
              <select
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sepa_core">SEPA Core</option>
                <option value="sepa_b2b">SEPA B2B</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="manual_invoice">Manual invoice</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            {(scheme === 'sepa_core' || scheme === 'sepa_b2b') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IBAN last 4 digits</label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  value={ibanLast4}
                  onChange={(e) => setIbanLast4(e.target.value)}
                  placeholder="4321"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-blue-600 text-white font-semibold text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create mandate'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
