'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

interface Props {
  type: 'remove-member' | 'revoke-invitation' | 'invite-form';
  id: string;
  label: string;
}

const inputStyle: React.CSSProperties = {
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
};

export default function TeamActions({ type, id, label }: Props) {
  const router = useRouter();
  const t = useT();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRemoveMember() {
    if (!confirm(t('dashboard.team.membersTable.confirmRemove'))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? t('dashboard.team.membersTable.removeFailed'));
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.team.membersTable.failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeInvitation() {
    if (!confirm(t('dashboard.team.pendingInvitations.confirmRevoke'))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? t('dashboard.team.pendingInvitations.revokeFailed'));
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.team.pendingInvitations.failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), role: form.get('role') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? t('dashboard.team.invite.failed'));
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.team.invite.failed'));
    } finally {
      setLoading(false);
    }
  }

  if (type === 'remove-member') {
    return (
      <button
        onClick={handleRemoveMember}
        disabled={loading}
        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
      >
        {loading ? '…' : label}
      </button>
    );
  }

  if (type === 'revoke-invitation') {
    return (
      <button
        onClick={handleRevokeInvitation}
        disabled={loading}
        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
      >
        {loading ? '…' : label}
      </button>
    );
  }

  return (
    <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label style={labelStyle}>{t('dashboard.team.invite.email')}</label>
        <input name="email" type="email" required placeholder="colleague@company.de" style={{ ...inputStyle, width: '240px' }} />
      </div>
      <div>
        <label style={labelStyle}>{t('dashboard.team.invite.role')}</label>
        <select
          name="role"
          style={{ ...inputStyle, width: 'auto' }}
        >
          <option value="owner">{t('dashboard.team.invite.roleOwner')}</option>
          <option value="billing_admin">{t('dashboard.team.invite.roleBillingAdmin')}</option>
          <option value="site_manager">{t('dashboard.team.invite.roleSiteManager')}</option>
          <option value="operator">{t('dashboard.team.invite.roleOperator')}</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{
          background: '#0f172a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 700,
          fontSize: '13px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? t('dashboard.team.invite.sending') : t('dashboard.team.invite.send')}
      </button>
      {error && (
        <p style={{ color: '#dc2626', fontSize: '13px', margin: '4px 0 0', width: '100%' }}>{error}</p>
      )}
    </form>
  );
}
