'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useT } from '@/lib/i18n';

interface Mandate {
  id: string;
  scheme: string;
  status: string;
  ibanLast4?: string;
  signedAt?: string;
  createdAt: string;
}

const STATUS_PILL: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  pending:   { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  active:    { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  cancelled: { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
  failed:    { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const defaultPill = { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' };

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '14px',
  color: '#0f172a',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
};

export default function CustomerMandatesPage() {
  const t = useT();
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;

  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheme, setScheme] = useState('sepa_core');
  const [ibanLast4, setIbanLast4] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMandates() {
    setLoading(true);
    const res = await fetch(`/api/billing/mandates?customerId=${customerId}`).catch(() => null);
    if (res?.ok) {
      const data: Mandate[] = await res.json();
      setMandates(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadMandates(); }, [customerId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/mandates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, scheme, ibanLast4: ibanLast4 || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? t('dashboard.customers.mandates.failedToCreate'));
        return;
      }
      setIbanLast4('');
      await loadMandates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.customers.mandates.unknownError'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Link href="/dashboard" style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: '16px' }}>
            {t('dashboard.customers.mandates.backToDashboard')}
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {t('dashboard.customers.mandates.title')}
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', fontFamily: 'monospace' }}>
            {t('dashboard.customers.mandates.customer')}: {customerId}
          </p>

          {/* Mandate list */}
          {loading ? (
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>{t('dashboard.customers.mandates.loading')}</p>
          ) : mandates.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>{t('dashboard.customers.mandates.noMandatesYet')}</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t('dashboard.customers.mandates.noMandatesHint')}</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <th style={thStyle}>{t('dashboard.customers.mandates.table.scheme')}</th>
                    <th style={thStyle}>{t('dashboard.customers.mandates.table.ibanLast4')}</th>
                    <th style={thStyle}>{t('dashboard.customers.mandates.table.status')}</th>
                    <th style={thStyle}>{t('dashboard.customers.mandates.table.created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mandates.map((m) => {
                    const pill = STATUS_PILL[m.status] ?? defaultPill;
                    return (
                      <tr key={m.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{m.scheme}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>{m.ibanLast4 ?? '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, background: pill.bg, color: pill.color, border: `1px solid ${pill.border}` }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
                            {t(`dashboard.customers.mandates.status.${m.status}`)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                          {new Date(m.createdAt).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add mandate form */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>{t('dashboard.customers.mandates.addMandate')}</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>{t('dashboard.customers.mandates.scheme')}</label>
                <select
                  value={scheme}
                  onChange={(e) => setScheme(e.target.value)}
                  style={inputStyle}
                >
                  <option value="sepa_core">{t('dashboard.customers.mandates.schemeOptions.sepa_core')}</option>
                  <option value="sepa_b2b">{t('dashboard.customers.mandates.schemeOptions.sepa_b2b')}</option>
                  <option value="card">{t('dashboard.customers.mandates.schemeOptions.card')}</option>
                  <option value="bank_transfer">{t('dashboard.customers.mandates.schemeOptions.bank_transfer')}</option>
                  <option value="manual_invoice">{t('dashboard.customers.mandates.schemeOptions.manual_invoice')}</option>
                  <option value="cash">{t('dashboard.customers.mandates.schemeOptions.cash')}</option>
                </select>
              </div>

              {(scheme === 'sepa_core' || scheme === 'sepa_b2b') && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>{t('dashboard.customers.mandates.ibanLast4Label')}</label>
                  <input
                    type="text"
                    maxLength={4}
                    pattern="\d{4}"
                    value={ibanLast4}
                    onChange={(e) => setIbanLast4(e.target.value)}
                    placeholder="4321"
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                  />
                </div>
              )}

              {error && (
                <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                style={{ width: '100%', background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '14px', padding: '10px', borderRadius: '8px', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {creating ? t('dashboard.customers.mandates.creating') : t('dashboard.customers.mandates.createMandate')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
