'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

export default function NewUnitTypePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const featuresRaw = (form.get('features') as string) ?? '';
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          sizeSqm: parseFloat(form.get('sizeSqm') as string),
          sizeCbm: form.get('sizeCbm') ? parseFloat(form.get('sizeCbm') as string) : undefined,
          doorType: form.get('doorType') || undefined,
          features: featuresRaw ? featuresRaw.split(',').map((f) => f.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.push(`/sites/${siteId}/unit-types`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/sites/${siteId}/unit-types`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Unit Types</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Add unit type</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input name="name" type="text" required placeholder="Small 5m²"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Size (m²)</label>
              <input name="sizeSqm" type="number" step="0.1" min="0.1" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Volume (m³) <span className="text-slate-400">optional</span></label>
              <input name="sizeCbm" type="number" step="0.1" min="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Door type <span className="text-slate-400">optional</span></label>
            <input name="doorType" type="text" placeholder="roller, swing, none"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Features <span className="text-slate-400">comma-separated</span></label>
            <input name="features" type="text" placeholder="climate_controlled, ground_floor"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Creating…' : 'Create unit type'}
            </button>
            <Link href={`/sites/${siteId}/unit-types`} className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
