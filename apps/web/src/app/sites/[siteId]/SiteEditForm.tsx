'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
}

export default function SiteEditForm({ site }: { site: Site }) {
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
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          address: {
            street: form.get('street'),
            city: form.get('city'),
            postalCode: form.get('postalCode'),
            country: form.get('country'),
          },
          timezone: form.get('timezone'),
          status: form.get('status'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update site');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to delete site');
      }
      router.push('/sites');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleteLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Site name</label>
        <input name="name" type="text" required defaultValue={site.name}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Street</label>
          <input name="street" type="text" required defaultValue={site.address.street}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
          <input name="city" type="text" required defaultValue={site.address.city}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Postal code</label>
          <input name="postalCode" type="text" required defaultValue={site.address.postalCode}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
          <input name="country" type="text" required defaultValue={site.address.country} maxLength={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <input name="timezone" type="text" required defaultValue={site.timezone}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select name="status" defaultValue={site.status}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <a href="/sites" className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</a>
        </div>
        <button type="button" onClick={handleDelete} disabled={deleteLoading}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
          {deleteLoading ? 'Deleting…' : 'Delete site'}
        </button>
      </div>
    </form>
  );
}
