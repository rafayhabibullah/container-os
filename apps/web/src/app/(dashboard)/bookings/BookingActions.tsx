'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';

interface Props { reservationId: string; orgId: string; status: string; }

const btnBase: React.CSSProperties = {
  padding: '5px 11px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background 0.12s, color 0.12s',
};

export function BookingActions({ reservationId, orgId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function act(action: 'approve' | 'reject') {
    setLoading(true);
    setError('');
    try {
      await clientFetch(
        `/v1/organisations/${orgId}/reservations/${reservationId}/${action}`,
        { method: 'POST' },
      );
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (status !== 'pending') {
    return (
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#cbd5e1' }}>
        —
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <button
        onClick={() => act('approve')}
        disabled={loading}
        style={{ ...btnBase, color: '#15803d', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#15803d'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#15803d'; }}
      >
        Approve
      </button>
      <button
        onClick={() => act('reject')}
        disabled={loading}
        style={{ ...btnBase, color: '#dc2626', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#dc2626'; }}
      >
        Reject
      </button>
      {error && (
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#dc2626' }}>{error}</span>
      )}
    </div>
  );
}
