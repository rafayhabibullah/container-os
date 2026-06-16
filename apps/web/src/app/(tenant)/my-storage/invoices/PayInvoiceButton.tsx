'use client';

import { useState } from 'react';

export default function PayInvoiceButton({ invoiceId, label }: { invoiceId: string; label: string }) {
  const [loading, setLoading] = useState(false);

  async function pay() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/invoices/${invoiceId}/pay`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data.message ?? 'Payment checkout failed');
      window.location.href = data.checkoutUrl;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Payment checkout failed');
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={pay}
      disabled={loading}
      style={{
        border: '1px solid #0f172a',
        background: '#0f172a',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.65 : 1,
      }}
    >
      {loading ? '...' : label}
    </button>
  );
}
