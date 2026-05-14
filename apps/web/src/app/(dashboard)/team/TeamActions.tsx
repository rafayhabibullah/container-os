'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  type: 'remove-member' | 'revoke-invitation' | 'invite-form';
  id: string;
  label: string;
}

export default function TeamActions({ type, id, label }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRemoveMember() {
    if (!confirm('Remove this member from the organisation?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to remove member');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeInvitation() {
    if (!confirm('Revoke this invitation?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to revoke invitation');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), role: form.get('role') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to send invitation');
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'remove-member') {
    return (
      <button onClick={handleRemoveMember} disabled={loading}
        className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : label}
      </button>
    );
  }

  if (type === 'revoke-invitation') {
    return (
      <button onClick={handleRevokeInvitation} disabled={loading}
        className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50">
        {loading ? '…' : label}
      </button>
    );
  }

  return (
    <form onSubmit={handleInvite} className="flex gap-3 items-end flex-wrap">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input name="email" type="email" required placeholder="colleague@company.de"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <select name="role"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="operator">Operator</option>
          <option value="tenant">Tenant</option>
        </select>
      </div>
      <button type="submit" disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Sending…' : 'Send invite'}
      </button>
      {error && <p className="text-red-600 text-sm w-full mt-1">{error}</p>}
    </form>
  );
}
