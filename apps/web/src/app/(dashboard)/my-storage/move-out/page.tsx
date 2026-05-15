'use client';

import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';

export default function MoveOutPage() {
  const [agreementId, setAgreementId] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/v1/tenant/move-out-requests', {
        method: 'POST',
        body: JSON.stringify({ agreementId, requestedDate }),
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit move-out request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg">✓</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Move-out request submitted</h2>
          <p className="text-sm text-slate-500">Your operator will review your request and confirm the move-out date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Request move-out</h1>
        <p className="text-sm text-slate-400 mt-0.5">Submit a move-out request to end your rental agreement</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Agreement ID</label>
            <input
              type="text"
              value={agreementId}
              onChange={(e) => setAgreementId(e.target.value)}
              placeholder="Your agreement ID from your contract"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Requested move-out date</label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-400 mt-1">Check your agreement for minimum notice period requirements.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Submitting…' : 'Submit move-out request'}
          </button>
        </form>
      </div>
    </div>
  );
}
