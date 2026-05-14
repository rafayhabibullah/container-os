'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Agreement {
  id: string;
  status: string;
}

export default function AgreementDetailActions({ agreement }: { agreement: Agreement }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [requestedDate, setRequestedDate] = useState('');
  const [operatorNote, setOperatorNote] = useState('');

  async function sendForSignature() {
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'send' },
      body: JSON.stringify({ personIds: [] }),
    });
    setLoading(false);
    router.refresh();
  }

  async function submitTermination(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'terminate' },
      body: JSON.stringify({ requestedDate, operatorNote }),
    });
    setLoading(false);
    setShowTerminate(false);
    router.refresh();
  }

  if (agreement.status === 'terminated') return null;

  return (
    <div className="flex flex-col gap-3">
      {agreement.status === 'draft' && (
        <button
          onClick={sendForSignature}
          disabled={loading}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send for signature
        </button>
      )}
      {(agreement.status === 'active' || agreement.status === 'signed') && !showTerminate && (
        <button
          onClick={() => setShowTerminate(true)}
          className="border border-red-300 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50"
        >
          Request termination
        </button>
      )}
      {showTerminate && (
        <form onSubmit={submitTermination} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">Termination request</p>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Requested end date</label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Operator note (optional)</label>
            <textarea
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowTerminate(false)} className="flex-1 border border-slate-300 text-slate-600 text-sm py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50">Submit</button>
          </div>
        </form>
      )}
    </div>
  );
}
