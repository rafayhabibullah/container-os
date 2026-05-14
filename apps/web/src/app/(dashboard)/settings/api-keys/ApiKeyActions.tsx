'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props { type: 'create' | 'revoke'; apiKeyId?: string; }

export default function ApiKeyActions({ type, apiKeyId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  if (type === 'revoke') {
    return (
      <button
        onClick={async () => {
          if (!confirm('Revoke this key? This cannot be undone.')) return;
          setLoading(true);
          try {
            const res = await fetch(`/api/settings/api-keys/${apiKeyId}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            router.refresh();
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed');
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : 'Revoke'}
      </button>
    );
  }

  if (newKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm font-medium text-yellow-800 mb-2">Copy your API key — it will not be shown again:</p>
        <code className="block bg-white border border-yellow-200 rounded px-3 py-2 text-xs font-mono break-all text-slate-800">
          {newKey}
        </code>
        <button onClick={() => { setNewKey(null); router.refresh(); }}
          className="mt-3 text-sm text-yellow-700 hover:text-yellow-900 underline">
          I have copied the key
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      const form = new FormData(e.currentTarget);
      try {
        const res = await fetch('/api/settings/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.get('name'), scopes: [] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Failed');
        setNewKey(data.rawKey);
        (e.target as HTMLFormElement).reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed');
      } finally {
        setLoading(false);
      }
    }} className="flex gap-2 items-end">
      <div>
        <label className="block text-xs text-slate-600 mb-1">Client name</label>
        <input name="name" type="text" required placeholder="Mobile App"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Creating…' : 'Create key'}
      </button>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </form>
  );
}
