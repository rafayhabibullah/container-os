'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface DelinquencyPolicy {
  id?: string;
  siteId: string;
  overdueDays: number;
  lockoutEnabled: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function DelinquencyPolicyPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;

  const [, setPolicy]          = useState<DelinquencyPolicy | null>(null);
  const [overdueDays, setOverdueDays]         = useState(14);
  const [lockoutEnabled, setLockoutEnabled]   = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [saved, setSaved]                     = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/billing/delinquency-policy?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data: DelinquencyPolicy | null) => {
        if (data) {
          setPolicy(data);
          setOverdueDays(data.overdueDays);
          setLockoutEnabled(data.lockoutEnabled);
        }
      })
      .catch(() => {});
  }, [siteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/billing/delinquency-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, overdueDays, lockoutEnabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? `Save failed: ${res.status}`);
        return;
      }
      const updated: DelinquencyPolicy = await res.json();
      setPolicy(updated);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>

          <Link href={`/sites/${siteId}`} style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            ← Site settings
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Delinquency policy
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Configure when invoices are marked overdue and whether lockout is enforced.
          </p>

          <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>OVERDUE THRESHOLD (DAYS AFTER DUE DATE)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={overdueDays}
                onChange={(e) => setOverdueDays(Number(e.target.value))}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="lockout"
                type="checkbox"
                checked={lockoutEnabled}
                onChange={(e) => setLockoutEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="lockout" style={{ fontSize: '14px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>
                Enable access lockout for overdue tenants
              </label>
            </div>

            <div style={{ paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="submit"
                disabled={saving}
                style={{ background: saving ? '#e2e8f0' : '#0f172a', color: saving ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }}
              >
                {saving ? 'Saving…' : 'Save policy'}
              </button>
            </div>
          </form>

          {saved && (
            <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Policy saved successfully.
            </div>
          )}
          {error && (
            <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {error}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
