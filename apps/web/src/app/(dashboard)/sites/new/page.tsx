'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

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

export default function NewSitePage() {
  const t = useT();
  const router = useRouter();
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          address: {
            street:     form.get('street'),
            city:       form.get('city'),
            postalCode: form.get('postalCode'),
            country:    form.get('country') || 'DE',
          },
          timezone: form.get('timezone') || 'Europe/Berlin',
          currency: form.get('currency') || 'EUR',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? t('dashboard.sites.new.errorCreate'));
      router.push(`/sites/${data.id}#unit-types`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.sites.new.errorCreate'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          <Link href="/sites" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            {t('dashboard.sites.new.backToSites')}
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t('dashboard.sites.new.title')}
          </h1>

          <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>{t('dashboard.sites.new.labelSiteName')}</label>
              <input name="name" type="text" required placeholder={t('dashboard.sites.new.placeholderSiteName')} style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>{t('dashboard.sites.new.labelStreetAddress')}</label>
                <input name="street" type="text" required placeholder={t('dashboard.sites.new.placeholderStreetAddress')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('dashboard.sites.new.labelCity')}</label>
                <input name="city" type="text" required placeholder={t('dashboard.sites.new.placeholderCity')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('dashboard.sites.new.labelPostalCode')}</label>
                <input name="postalCode" type="text" required placeholder={t('dashboard.sites.new.placeholderPostalCode')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('dashboard.sites.new.labelCountryCode')}</label>
                <input name="country" type="text" defaultValue="DE" maxLength={2} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('dashboard.sites.new.labelTimezone')}</label>
                <input name="timezone" type="text" defaultValue="Europe/Berlin" style={inputStyle} />
              </div>
            </div>

            {error && (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="submit"
                disabled={loading}
                style={{ background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {loading ? t('dashboard.sites.new.creating') : t('dashboard.sites.new.createSite')}
              </button>
              <Link href="/sites" style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '10px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {t('dashboard.sites.new.cancel')}
              </Link>
            </div>
          </form>

        </div>
      </div>
    </>
  );
}
