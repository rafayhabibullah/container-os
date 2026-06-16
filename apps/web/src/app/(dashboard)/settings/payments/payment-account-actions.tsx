'use client';

import { useState } from 'react';

export default function PaymentAccountActions({ onboardingUrl }: { onboardingUrl: string | null }) {
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch('/api/settings/payment-account/onboarding', { method: 'POST' });
    const data = await res.json();
    if (data.onboardingUrl) window.location.href = data.onboardingUrl;
    else {
      alert('Onboarding konnte nicht gestartet werden.');
      setLoading(false);
    }
  }

  async function completeManual() {
    setLoading(true);
    const providerAccountId = prompt('Mollie Organisation/Konto-ID');
    if (!providerAccountId) {
      setLoading(false);
      return;
    }
    const res = await fetch('/api/settings/payment-account/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerAccountId }),
    });
    if (!res.ok) alert('Mollie-Konto konnte nicht gespeichert werden.');
    window.location.reload();
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
      <button onClick={start} disabled={loading}>Mollie verbinden</button>
      {onboardingUrl && <a href={onboardingUrl}>Onboarding fortsetzen</a>}
      <button onClick={completeManual} disabled={loading}>Manuell als verbunden markieren</button>
    </div>
  );
}
