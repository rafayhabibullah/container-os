'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

export function PlanSwitchButton({
  plan,
  planLabel,
  style,
  billingInterval = 'monthly',
}: {
  plan: string;
  planLabel: string;
  style: React.CSSProperties;
  billingInterval?: 'monthly' | 'yearly';
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    if (plan === 'free' && !window.confirm(t('dashboard.billing.switchConfirm', { plan: planLabel }))) return;
    setError('');
    setPending(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingInterval, redirectUrl: `${window.location.origin}/billing?checkout=return` }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.error?.code ?? data?.code;
        setError(code === 'PAYMENT_PROVIDER_NOT_CONFIGURED'
          ? t('dashboard.billing.paymentNotConfigured')
          : data?.error?.message ?? data?.message ?? t('dashboard.billing.switchFailed'));
        return;
      }
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      router.refresh();
    } catch {
      setError(t('dashboard.billing.switchFailed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
      <button onClick={handleClick} disabled={pending} style={{ ...style, opacity: pending ? 0.6 : 1 }}>
        {pending ? t('dashboard.billing.switching') : t('dashboard.billing.switch')}
      </button>
      {error && (
        <span role="alert" style={{ maxWidth: '320px', color: '#b91c1c', fontSize: '11px', lineHeight: 1.4, textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  );
}
