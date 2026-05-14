'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewSitePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          address: {
            street: form.get('street'),
            city: form.get('city'),
            postalCode: form.get('postalCode'),
            country: form.get('country') || 'DE',
          },
          timezone: form.get('timezone') || 'Europe/Berlin',
          currency: form.get('currency') || 'EUR',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create site');
      router.push('/sites');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Sites</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Add a new site</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site name</label>
            <input name="name" type="text" required placeholder="Berlin Mitte Self-Storage"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Street address</label>
              <input name="street" type="text" required placeholder="Hauptstr. 1"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input name="city" type="text" required placeholder="Berlin"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Postal code</label>
              <input name="postalCode" type="text" required placeholder="10115"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country code</label>
              <input name="country" type="text" defaultValue="DE" maxLength={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
              <input name="timezone" type="text" defaultValue="Europe/Berlin"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Creating…' : 'Create site'}
            </button>
            <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
