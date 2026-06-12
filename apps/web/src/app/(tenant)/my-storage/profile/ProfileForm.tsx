'use client';

import { useState } from 'react';
import type { TenantProfile } from './page';
import { updateProfile } from './actions';
import { useT } from '@/lib/i18n';

const inputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

export default function ProfileForm({ profile }: { profile: TenantProfile }) {
  const t = useT();
  const [name, setName] = useState(profile.name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await updateProfile({ name: name.trim() || null, phone: phone.trim() || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('myStorage.profile.errorGeneric'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px' }}>
      <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
        <p style={{ ...labelStyle, marginBottom: '4px' }}>{t('myStorage.profile.emailLabel')}</p>
        <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>{profile.email}</p>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>{t('myStorage.profile.emailHint')}</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={labelStyle}>{t('myStorage.profile.fullNameLabel')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('myStorage.profile.fullNamePlaceholder')}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>{t('myStorage.profile.phoneLabel')}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+49 30 12345678"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? t('myStorage.profile.saving') : t('myStorage.profile.save')}
          </button>
          {saved && (
            <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>{t('myStorage.profile.saved')}</span>
          )}
        </div>
      </form>
    </div>
  );
}
