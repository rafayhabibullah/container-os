'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  type: 'create' | 'update';
  taskId?: string;
  currentStatus?: string;
}

const NEXT_STATUSES: Record<string, string[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function TaskActions({ type, taskId, currentStatus }: Props) {
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

  if (type === 'create') {
    return showForm ? (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction('/api/tasks', 'POST', {
          siteId: form.get('siteId'),
          title: form.get('title'),
          dueAt: form.get('dueAt') || undefined,
        });
      }} className="flex gap-2 items-end">
        <input name="siteId" placeholder="Site ID" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-32" />
        <input name="title" placeholder="Task title" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48" />
        <input name="dueAt" type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
          {loading ? '…' : 'Add'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
        {error && <p className="text-red-600 text-xs">{error}</p>}
      </form>
    ) : (
      <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
        + New task
      </button>
    );
  }

  const nextStatuses = NEXT_STATUSES[currentStatus ?? 'open'] ?? [];
  if (nextStatuses.length === 0) return null;

  return (
    <div className="flex gap-1">
      {nextStatuses.map((status) => (
        <button key={status} onClick={() => doAction(`/api/tasks/${taskId}`, 'PATCH', { status })}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded disabled:opacity-50">
          {status.replace('_', ' ')}
        </button>
      ))}
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
