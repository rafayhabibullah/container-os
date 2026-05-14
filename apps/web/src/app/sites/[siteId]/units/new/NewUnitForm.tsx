'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }

export default function NewUnitForm({ siteId, unitTypes }: { siteId: string; unitTypes: UnitType[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: form.get('unitCode'),
          unitTypeId: form.get('unitTypeId'),
          kind: form.get('kind'),
          driveUp: form.get('driveUp') === 'on',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create unit');
      router.push(`/sites/${siteId}/units`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Unit code</label>
        <input name="unitCode" type="text" required placeholder="A-101"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Unit type</label>
        <select name="unitTypeId" required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select a unit type…</option>
          {unitTypes.map((ut) => (
            <option key={ut.id} value={ut.id}>{ut.name} ({ut.sizeSqm}m²)</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Kind</label>
        <select name="kind"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="self_storage">Self Storage</option>
          <option value="container">Container</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input name="driveUp" type="checkbox" id="driveUp" className="rounded" />
        <label htmlFor="driveUp" className="text-sm text-slate-700">Drive-up access</label>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {loading ? 'Creating…' : 'Create unit'}
        </button>
        <Link href={`/sites/${siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</Link>
      </div>
    </form>
  );
}
