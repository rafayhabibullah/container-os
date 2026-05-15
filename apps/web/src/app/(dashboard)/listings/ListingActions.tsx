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

  async function transition(action: 'publish' | 'pause' | 'archive') {
    setLoading(true);
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}/${action}`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      {status === 'draft' && (
        <button onClick={() => transition('publish')} disabled={loading}
          className="text-sm text-blue-600 font-medium hover:underline disabled:opacity-50">
          Publish
        </button>
      )}
      {status === 'published' && (
        <button onClick={() => transition('pause')} disabled={loading}
          className="text-sm text-amber-600 font-medium hover:underline disabled:opacity-50">
          Pause
        </button>
      )}
      {status !== 'archived' && (
        <button onClick={() => transition('archive')} disabled={loading}
          className="text-sm text-slate-400 font-medium hover:underline disabled:opacity-50">
          Archive
        </button>
      )}
    </div>
  );
}
