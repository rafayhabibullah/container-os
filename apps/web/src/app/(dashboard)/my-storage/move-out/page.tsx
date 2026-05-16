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
      <>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '10px', padding: '40px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span style={{ color: '#16a34a', fontSize: '22px', fontWeight: 700 }}>✓</span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>Move-out request submitted</h2>
              <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>Your operator will review your request and confirm the move-out date.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Request move-out</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>Submit a move-out request to end your rental agreement</p>

          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', padding: '24px' }}>
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '9px 12px', fontSize: '13px', marginBottom: '12px' }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px', letterSpacing: '0.03em' }}>
                  Agreement ID
                </label>
                <input
                  type="text"
                  value={agreementId}
                  onChange={(e) => setAgreementId(e.target.value)}
                  placeholder="Your agreement ID from your contract"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', color: '#0f172a', fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px', letterSpacing: '0.03em' }}>
                  Requested move-out date
                </label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', color: '#0f172a', fontSize: '14px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' }}
                  required
                />
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>Check your agreement for minimum notice period requirements.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Submitting…' : 'Submit move-out request'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
