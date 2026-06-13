'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/lib/i18n';

interface Agreement {
  id: string;
  status: string;
  tenantId: string;
}

export default function AgreementActions({ agreement }: { agreement: Agreement }) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'send' },
      body: JSON.stringify({ personIds: [agreement.tenantId] }),
    });
    setLoading(false);
    router.refresh();
  }

  async function terminate() {
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'terminate' },
      body: JSON.stringify({}),
    });
    setLoading(false);
    router.refresh();
  }

  if (agreement.status === 'terminated') {
    return <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>;
  }

  const baseBtn: React.CSSProperties = {
    borderRadius: '6px', padding: '5px 11px', fontSize: '12px', fontWeight: 600,
    opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
      {agreement.status === 'draft' && (
        <button onClick={send} disabled={loading} style={{ ...baseBtn, background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1' }}>
          {t('dashboard.agreements.actions.send')}
        </button>
      )}
      {agreement.status !== 'terminated' && (
        <button onClick={terminate} disabled={loading} style={{ ...baseBtn, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          {t('dashboard.agreements.actions.terminate')}
        </button>
      )}
    </div>
  );
}
