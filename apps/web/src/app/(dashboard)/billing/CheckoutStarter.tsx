'use client';

import { useEffect, useRef, useState } from 'react';

export function CheckoutStarter({ plan, billingInterval }: { plan: string; billingInterval: string }) {
  const started = useRef(false);
  const [message, setMessage] = useState('Preparing secure Mollie checkout...');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, billingInterval, redirectUrl: `${window.location.origin}/billing?checkout=return` }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = data?.error?.code === 'PAYMENT_PROVIDER_NOT_CONFIGURED'
            ? 'Secure payment checkout is not configured yet. Add the Mollie API key to enable paid upgrades.'
            : data?.error?.message ?? data?.message ?? 'Could not start checkout';
          throw new Error(message);
        }
        if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
        else window.location.assign('/dashboard');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not start checkout'));
  }, [billingInterval, plan]);

  return <div style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px' }}>{message}</div>;
}
