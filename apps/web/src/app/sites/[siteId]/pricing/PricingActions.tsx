'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface UnitType { id: string; name: string; }

interface Props {
  type: 'create-book' | 'book-actions' | 'add-rule' | 'remove-rule';
  siteId: string;
  priceBookId?: string;
  rateRuleId?: string;
  bookStatus?: string;
  unitTypes: UnitType[];
}

export default function PricingActions({ type, siteId, priceBookId, rateRuleId, bookStatus, unitTypes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function doAction(url: string, method: string, body?: object) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.refresh();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'create-book') {
    return showForm ? (
      <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction(`/api/sites/${siteId}/price-books`, 'POST', {
          name: form.get('name'), effectiveFrom: form.get('effectiveFrom'),
        });
      }} className="flex gap-2 items-end">
        <input name="name" placeholder="Book name" required
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40" />
        <input name="effectiveFrom" type="date" required
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
          {loading ? '…' : 'Create'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
        {error && <p className="text-red-600 text-xs">{error}</p>}
      </form>
    ) : (
      <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
        + New price book
      </button>
    );
  }

  if (type === 'book-actions') {
    return (
      <div className="flex gap-2">
        {bookStatus === 'draft' && (
          <button onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/publish`, 'POST')}
            disabled={loading} className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50">
            {loading ? '…' : 'Publish'}
          </button>
        )}
        {bookStatus === 'published' && (
          <button onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/archive`, 'POST')}
            disabled={loading} className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50">
            {loading ? '…' : 'Archive'}
          </button>
        )}
        {error && <p className="text-red-600 text-xs">{error}</p>}
      </div>
    );
  }

  if (type === 'remove-rule') {
    return (
      <button onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/rate-rules/${rateRuleId}`, 'DELETE')}
        disabled={loading} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : 'Remove'}
      </button>
    );
  }

  // add-rule
  return showForm ? (
    <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      await doAction(`/api/sites/${siteId}/price-books/${priceBookId}/rate-rules`, 'POST', {
        unitTypeId: form.get('unitTypeId'),
        amountMinor: Math.round(parseFloat(form.get('amountEur') as string) * 100),
        billingCycle: form.get('billingCycle'),
      });
    }} className="flex gap-2 items-end flex-wrap">
      <select name="unitTypeId" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option value="">Unit type…</option>
        {unitTypes.map((ut) => <option key={ut.id} value={ut.id}>{ut.name}</option>)}
      </select>
      <input name="amountEur" type="number" step="0.01" min="0" placeholder="Price (€)" required
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-28" />
      <select name="billingCycle" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option value="monthly">Monthly</option>
        <option value="fixed_term">Fixed term</option>
      </select>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
        {loading ? '…' : 'Add rule'}
      </button>
      <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
      {error && <p className="text-red-600 text-xs w-full">{error}</p>}
    </form>
  ) : (
    <button onClick={() => setShowForm(true)} className="text-sm text-blue-600 hover:underline">+ Add rate rule</button>
  );
}
