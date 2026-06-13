'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

interface Unit { id: string; unitCode: string; kind: string; status: string; driveUp: boolean; }

const STATUSES = [
  { value: 'available',      i18n: 'statusAvailable' },
  { value: 'maintenance',     i18n: 'statusMaintenance' },
  { value: 'out_of_service',  i18n: 'statusOutOfService' },
];

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

export default function UnitEditForm({ unit, siteId }: { unit: Unit; siteId: string }) {
  const t = useT();
  const router = useRouter();
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: form.get('unitCode'),
          driveUp:  form.get('driveUp') === 'on',
          status:   form.get('status'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? t('dashboard.sites.unitEditForm.errorUpdate'));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.sites.unitEditForm.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(t('dashboard.sites.unitEditForm.confirmDelete', { code: unit.unitCode }))) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${unit.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? t('dashboard.sites.unitEditForm.errorGeneric')); }
      router.push(`/sites/${siteId}/units`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.sites.unitEditForm.errorGeneric'));
      setDeleteLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>{t('dashboard.sites.unitEditForm.labelUnitCode')}</label>
        <input name="unitCode" type="text" required defaultValue={unit.unitCode} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>{t('dashboard.sites.unitEditForm.labelStatus')}</label>
        <select name="status" defaultValue={unit.status} style={inputStyle}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{t(`dashboard.sites.unitEditForm.${s.i18n}`)}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input name="driveUp" type="checkbox" id="driveUp" defaultChecked={unit.driveUp} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
        <label htmlFor="driveUp" style={{ fontSize: '14px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>{t('dashboard.sites.unitEditForm.driveUpAccess')}</label>
      </div>

      {error && (
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{ background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {loading ? t('dashboard.sites.unitEditForm.saving') : t('dashboard.sites.unitEditForm.saveChanges')}
          </button>
          <a href={`/sites/${siteId}/units`} style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '10px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t('dashboard.sites.unitEditForm.cancel')}
          </a>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteLoading}
          style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {deleteLoading ? t('dashboard.sites.unitEditForm.deleting') : t('dashboard.sites.unitEditForm.deleteUnit')}
        </button>
      </div>
    </form>
  );
}
