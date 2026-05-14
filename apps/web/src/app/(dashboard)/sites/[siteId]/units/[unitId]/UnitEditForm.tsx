'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Unit { id: string; unitCode: string; kind: string; status: string; driveUp: boolean; }

const STATUSES = ['available', 'maintenance', 'out_of_service'];

export default function UnitEditForm({ unit, siteId }: { unit: Unit; siteId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: form.get('unitCode'),
          driveUp: form.get('driveUp') === 'on',
          status: form.get('status'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update unit');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete unit ${unit.unitCode}?`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${unit.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Failed'); }
      router.push(`/sites/${siteId}/units`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setDeleteLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Unit code</label>
        <input name="unitCode" type="text" required defaultValue={unit.unitCode}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select name="status" defaultValue={unit.status}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input name="driveUp" type="checkbox" id="driveUp" defaultChecked={unit.driveUp} className="rounded" />
        <label htmlFor="driveUp" className="text-sm text-slate-700">Drive-up access</label>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <a href={`/sites/${siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</a>
        </div>
        <button type="button" onClick={handleDelete} disabled={deleteLoading}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
          {deleteLoading ? 'Deleting…' : 'Delete unit'}
        </button>
      </div>
    </form>
  );
}
