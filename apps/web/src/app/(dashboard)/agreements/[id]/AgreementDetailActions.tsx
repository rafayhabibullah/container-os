'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Agreement {
  id: string;
  status: string;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {agreement.status === 'draft' && (
        <button
          onClick={sendForSignature}
          disabled={loading}
          style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: loading ? 0.5 : 1 }}
        >
          Send for signature
        </button>
      )}

      {(agreement.status === 'active' || agreement.status === 'signed') && !showTerminate && (
        <button
          onClick={() => setShowTerminate(true)}
          style={{ border: '1px solid #fecaca', color: '#dc2626', background: '#fef2f2', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Request termination
        </button>
      )}

      {showTerminate && (
        <form
          onSubmit={submitTermination}
          style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Termination request
          </p>

          <div>
            <label style={labelStyle}>Requested end date</label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Operator note (optional)</label>
            <textarea
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowTerminate(false)}
              style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: loading ? 0.5 : 1 }}
            >
              Submit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
