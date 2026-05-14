'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  type: 'report' | 'update';
  incidentId?: string;
  currentStatus?: string;
}

export default function IncidentActions({ type, incidentId, currentStatus }: Props) {
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

  if (type === 'report') {
    return showForm ? (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction('/api/incidents', 'POST', {
          siteId: form.get('siteId'),
          type: form.get('type'),
          severity: form.get('severity'),
        });
      }} className="flex gap-2 items-end flex-wrap justify-end">
        <input name="siteId" placeholder="Site ID" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-28" />
        <input name="type" placeholder="Incident type" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40" />
        <select name="severity" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button type="submit" disabled={loading} className="bg-red-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
          {loading ? '…' : 'Report'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
        {error && <p className="text-red-600 text-xs w-full">{error}</p>}
      </form>
    ) : (
      <button onClick={() => setShowForm(true)} className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700">
        Report incident
      </button>
    );
  }

  const transitions: Record<string, string[]> = {
    open: ['investigating', 'resolved'],
    investigating: ['resolved'],
  };
  const next = transitions[currentStatus ?? 'open'] ?? [];
  if (next.length === 0) return null;

  return (
    <div className="flex gap-1">
      {next.map((status) => (
        <button key={status} onClick={() => doAction(`/api/incidents/${incidentId}`, 'PATCH', { status })}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded disabled:opacity-50">
          {status}
        </button>
      ))}
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
