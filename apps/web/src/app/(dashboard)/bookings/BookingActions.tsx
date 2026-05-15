'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';

interface Props { reservationId: string; orgId: string; status: string; }

export function BookingActions({ reservationId, orgId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: 'approve' | 'reject') {
    setLoading(true);
    try {
      await clientFetch(
        `/v1/organisations/${orgId}/reservations/${reservationId}/${action}`,
        { method: 'POST' },
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status !== 'pending') return <span className="text-slate-400 text-xs">{status}</span>;

  return (
    <div className="flex gap-3">
      <button onClick={() => act('approve')} disabled={loading}
        className="text-sm text-green-600 font-semibold hover:underline disabled:opacity-50">
        Approve
      </button>
      <button onClick={() => act('reject')} disabled={loading}
        className="text-sm text-red-500 font-medium hover:underline disabled:opacity-50">
        Reject
      </button>
    </div>
  );
}
