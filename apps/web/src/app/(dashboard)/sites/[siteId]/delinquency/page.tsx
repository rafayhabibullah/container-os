'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface DelinquencyPolicy {
  id?: string;
  siteId: string;
  overdueDays: number;
  lockoutEnabled: boolean;
}

export default function DelinquencyPolicyPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;

  const [, setPolicy] = useState<DelinquencyPolicy | null>(null);
  const [overdueDays, setOverdueDays] = useState(14);
  const [lockoutEnabled, setLockoutEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/billing/delinquency-policy?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data: DelinquencyPolicy | null) => {
        if (data) {
          setPolicy(data);
          setOverdueDays(data.overdueDays);
          setLockoutEnabled(data.lockoutEnabled);
        }
      })
      .catch(() => {});
  }, [siteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/billing/delinquency-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, overdueDays, lockoutEnabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? `Save failed: ${res.status}`);
        return;
      }
      const updated: DelinquencyPolicy = await res.json();
      setPolicy(updated);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-xl mx-auto">
        <Link href={`/sites/${siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Site settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Delinquency policy</h1>
        <p className="text-slate-500 text-sm mb-8">
          Configure when invoices are marked overdue and whether lockout is enforced.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Overdue threshold (days after due date)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={overdueDays}
              onChange={(e) => setOverdueDays(Number(e.target.value))}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="lockout"
              type="checkbox"
              checked={lockoutEnabled}
              onChange={(e) => setLockoutEnabled(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="lockout" className="text-sm text-slate-700">
              Enable access lockout for overdue tenants
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white font-semibold text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save policy'}
          </button>
        </form>

        {saved && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
            Policy saved.
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
