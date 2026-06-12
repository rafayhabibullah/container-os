'use client';

import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

export default function SignButton({ agreementId }: { agreementId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useT();

  async function handleSign() {
    setLoading(true);
    setError(null);
    try {
      await clientFetch(`/v1/tenant/agreements/${agreementId}/sign`, {
        method: 'POST',
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('myStorage.signButton.errorSign'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleSign}
        disabled={loading}
        style={{
          background: loading ? '#93c5fd' : '#2563eb',
          border: 'none',
          borderRadius: '8px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 700,
          padding: '12px 28px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: '-0.01em',
        }}
      >
        {loading ? t('myStorage.signButton.signing') : t('myStorage.signButton.sign')}
      </button>
      {error && (
        <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
