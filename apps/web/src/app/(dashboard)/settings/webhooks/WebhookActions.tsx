'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props { type: 'create' | 'delete'; webhookId?: string; }

export default function WebhookActions({ type, webhookId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'delete') {
    return (
      <button onClick={() => { if (confirm('Delete this webhook?')) doAction(`/api/settings/webhooks/${webhookId}`, 'DELETE'); }}
        disabled={loading} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : 'Delete'}
      </button>
    );
  }

  return (
    <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      await doAction('/api/settings/webhooks', 'POST', {
        url: form.get('url'),
        subscriptions: (form.get('subscriptions') as string).split(',').map((s) => s.trim()).filter(Boolean),
        secret: form.get('secret'),
      });
      (e.target as HTMLFormElement).reset();
    }} className="flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-xs text-slate-600 mb-1">Endpoint URL</label>
        <input name="url" type="url" required placeholder="https://yourapp.com/webhooks"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Events (comma-separated)</label>
        <input name="subscriptions" required placeholder="invoice.paid, agreement.signed"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-52" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Secret</label>
        <input name="secret" type="password" required placeholder="webhook_secret"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Adding…' : 'Add endpoint'}
      </button>
      {error && <p className="text-red-600 text-xs w-full">{error}</p>}
    </form>
  );
}
