'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Reservation {
  id: string;
  status: string;
}

export default function ReservationActions({ reservation }: { reservation: Reservation }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/reservations/${reservation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  async function createAgreement() {
    setLoading(true);
    const res = await fetch(`/api/reservations/${reservation.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'agreement' },
      body: JSON.stringify({ billingCycle: 'monthly', language: 'de', pricingSnapshot: {} }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.agreementId) router.push('/agreements');
    else router.refresh();
  }

  if (reservation.status === 'cancelled' || reservation.status === 'expired' || reservation.status === 'converted') {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {reservation.status === 'pending_signature' && (
        <button
          onClick={() => updateStatus('confirmed')}
          disabled={loading}
          className="text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50 disabled:opacity-50"
        >
          Confirm
        </button>
      )}
      {reservation.status === 'confirmed' && (
        <button
          onClick={createAgreement}
          disabled={loading}
          className="text-xs text-purple-700 border border-purple-300 rounded px-2 py-1 hover:bg-purple-50 disabled:opacity-50"
        >
          Create agreement
        </button>
      )}
      {(reservation.status === 'pending' || reservation.status === 'pending_signature' || reservation.status === 'confirmed') && (
        <button
          onClick={() => updateStatus('cancelled')}
          disabled={loading}
          className="text-xs text-red-600 border border-red-300 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
