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

  if (
    reservation.status === 'cancelled' ||
    reservation.status === 'expired' ||
    reservation.status === 'converted'
  ) {
    return <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>;
  }

  const baseBtn: React.CSSProperties = {
    borderRadius: '6px',
    padding: '5px 11px',
    fontSize: '12px',
    fontWeight: 600,
    opacity: loading ? 0.5 : 1,
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
      {reservation.status === 'pending_signature' && (
        <button
          onClick={() => updateStatus('confirmed')}
          disabled={loading}
          style={{
            ...baseBtn,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
          }}
        >
          Confirm
        </button>
      )}
      {reservation.status === 'confirmed' && (
        <button
          onClick={createAgreement}
          disabled={loading}
          style={{
            ...baseBtn,
            background: '#faf5ff',
            border: '1px solid #ddd6fe',
            color: '#6d28d9',
          }}
        >
          Create agreement
        </button>
      )}
      {(reservation.status === 'pending' ||
        reservation.status === 'pending_signature' ||
        reservation.status === 'confirmed') && (
        <button
          onClick={() => updateStatus('cancelled')}
          disabled={loading}
          style={{
            ...baseBtn,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
