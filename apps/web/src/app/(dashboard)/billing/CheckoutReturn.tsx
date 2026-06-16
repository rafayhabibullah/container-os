'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutReturn() {
  const started = useRef(false);
  const router = useRouter();
  const [message, setMessage] = useState('Confirming your payment with Mollie...');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch('/api/billing/reconcile-checkout', { method: 'POST' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Could not confirm payment');
        const paymentStatus = data?.paymentStatus;
        const subscriptionStatus = data?.subscription?.status;
        if (paymentStatus === 'paid' && subscriptionStatus === 'active') {
          setMessage('Payment confirmed. Your paid plan is active.');
          router.refresh();
          return;
        }
        if (['failed', 'canceled', 'expired'].includes(paymentStatus)) {
          setError(true);
          setMessage('Payment was not completed. Your plan was not upgraded.');
          return;
        }
        setMessage('Payment is still processing. Refresh this page in a moment.');
      })
      .catch((checkoutError) => {
        setError(true);
        setMessage(checkoutError instanceof Error ? checkoutError.message : 'Could not confirm payment');
      });
  }, [router]);

  return (
    <div role="status" style={{ background: error ? '#fef2f2' : '#eff6ff', color: error ? '#b91c1c' : '#1d4ed8', border: `1px solid ${error ? '#fecaca' : '#bfdbfe'}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px' }}>
      {message}
    </div>
  );
}
