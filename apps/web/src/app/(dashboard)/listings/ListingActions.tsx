'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';

interface Props {
  listingId: string;
  orgId: string;
  status: string;
}

export function ListingActions({ listingId, orgId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function transition(action: 'publish' | 'pause' | 'archive') {
    setLoading(true);
    setError('');
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}/${action}`, { method: 'POST' });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const btnStyle: React.CSSProperties = {
    padding: '5px 11px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#64748b',
    fontSize: '12px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.12s, color 0.12s',
  };

  const hover = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      const b = e.currentTarget;
      b.style.background = '#f1f5f9';
      b.style.color = '#0f172a';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      const b = e.currentTarget;
      b.style.background = '#f8fafc';
      b.style.color = '#64748b';
    },
  };

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {status === 'draft' && (
        <button onClick={() => transition('publish')} disabled={loading} style={btnStyle} {...hover}>
          Publish
        </button>
      )}
      {status === 'published' && (
        <button onClick={() => transition('pause')} disabled={loading} style={btnStyle} {...hover}>
          Pause
        </button>
      )}
      {status !== 'archived' && (
        <button onClick={() => transition('archive')} disabled={loading} style={btnStyle} {...hover}>
          Archive
        </button>
      )}
      {error && (
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#dc2626' }}>
          {error}
        </span>
      )}
    </div>
  );
}
