'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function VoidInvoiceButton({
  orgId,
  invoiceId,
  label,
  confirmText,
  errorText,
}: {
  orgId: string;
  invoiceId: string;
  label: string;
  confirmText: string;
  errorText: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (!window.confirm(confirmText)) return;
    setPending(true);
    try {
      const res = await fetch('/api/billing/void-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisationId: orgId, invoiceId }),
      });
      if (!res.ok) {
        alert(errorText);
        return;
      }
      router.refresh();
    } catch {
      alert(errorText);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      style={{ border: '1px solid #fecaca', color: '#dc2626', background: '#fef2f2', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: pending ? 0.6 : 1 }}
    >
      {label}
    </button>
  );
}
