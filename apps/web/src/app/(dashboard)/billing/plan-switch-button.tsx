'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

export function PlanSwitchButton({
  plan,
  planLabel,
  style,
}: {
  plan: string;
  planLabel: string;
  style: React.CSSProperties;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (!window.confirm(t('dashboard.billing.switchConfirm', { plan: planLabel }))) return;
    setPending(true);
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        alert(t('dashboard.billing.switchFailed'));
        return;
      }
      router.refresh();
    } catch {
      alert(t('dashboard.billing.switchFailed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={pending} style={{ ...style, opacity: pending ? 0.6 : 1 }}>
      {pending ? t('dashboard.billing.switching') : t('dashboard.billing.switch')}
    </button>
  );
}
