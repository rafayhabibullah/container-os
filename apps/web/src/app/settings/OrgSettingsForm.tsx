'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Organisation {
  id: string;
  legalName: string;
  tradingName: string | null;
  billingEmail: string;
  supportEmail: string | null;
  phone: string | null;
  website: string | null;
  vatId: string | null;
  taxNumber: string | null;
}

export default function OrgSettingsForm({ org }: { org: Organisation }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const body: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value.trim()) body[key] = value.trim();
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to save settings');
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, name: string, defaultValue: string | null, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue ?? ''}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Legal name</label>
        <input value={org.legalName} disabled
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
        <p className="text-xs text-slate-400 mt-1">Contact support to change your legal name.</p>
      </div>

      {field('Trading name', 'tradingName', org.tradingName)}
      {field('Billing email', 'billingEmail', org.billingEmail, 'email')}
      {field('Support email', 'supportEmail', org.supportEmail, 'email')}
      {field('Phone', 'phone', org.phone)}
      {field('Website', 'website', org.website)}
      {field('VAT ID', 'vatId', org.vatId)}
      {field('Tax number', 'taxNumber', org.taxNumber)}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">Settings saved.</p>}

      <button type="submit" disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
