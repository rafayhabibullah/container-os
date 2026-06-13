'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

export interface UnitType {
  id: string;
  name: string;
  sizeSqm: number;
  sizeCbm: number | null;
  doorType: string | null;
  features: string[];
}

interface Unit { unitType: { id: string } | null; }

interface SiteSummary { id: string; name: string; }

interface Props {
  siteId: string;
  unitTypes: UnitType[];
  units: Unit[];
  otherSites: SiteSummary[];
  canEdit: boolean;
}

const FEATURE_KEYS = [
  { key: 'climate_controlled', i18n: 'featureClimateControlled' },
  { key: 'ground_floor',       i18n: 'featureGroundFloor'       },
  { key: 'top_floor',          i18n: 'featureTopFloor'          },
  { key: 'drive_up',           i18n: 'featureDriveUp'           },
  { key: 'outdoor',            i18n: 'featureOutdoor'           },
  { key: 'alarmed',            i18n: 'featureAlarmed'           },
] as const;

const DOOR_OPTIONS = ['roller', 'swing', 'none', 'other'];

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569',
  marginBottom: '4px', letterSpacing: '0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const btnPrimary: React.CSSProperties = {
  background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const btnGhost: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
  color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
  padding: '9px 12px',
};
const btnSecondary: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '9px 14px', fontWeight: 600, fontSize: '13px', color: '#475569',
  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function UnitTypeForm({
  initial,
  onSave,
  onCancel,
  onDelete,
  loading,
  deleteLoading,
  error,
  modal,
}: {
  initial?: UnitType;
  onSave: (data: Omit<UnitType, 'id'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  loading: boolean;
  deleteLoading?: boolean;
  error: string;
  modal?: boolean;
}) {
  const t = useT();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initial?.features ?? []);

  function toggleFeature(key: string) {
    setSelectedFeatures(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSave({
      name:     form.get('name') as string,
      sizeSqm:  parseFloat(form.get('sizeSqm') as string),
      sizeCbm:  form.get('sizeCbm') ? parseFloat(form.get('sizeCbm') as string) : null,
      doorType: (form.get('doorType') as string) || null,
      features: selectedFeatures,
    });
  }

  const containerStyle: React.CSSProperties = modal
    ? { display: 'flex', flexDirection: 'column', gap: '14px' }
    : { display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' };

  return (
    <form onSubmit={handleSubmit} style={containerStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
        <div>
          <label style={lbl}>{t('dashboard.sites.unitTypes.labelName')}</label>
          <input name="name" required defaultValue={initial?.name} placeholder={t('dashboard.sites.unitTypes.placeholderName')} style={inp} />
        </div>
        <div>
          <label style={lbl}>{t('dashboard.sites.unitTypes.labelSizeSqm')}</label>
          <input name="sizeSqm" type="number" step="0.1" min="0.1" required defaultValue={initial?.sizeSqm} style={inp} />
        </div>
        <div>
          <label style={lbl}>{t('dashboard.sites.unitTypes.labelVolumeCbm')}</label>
          <input name="sizeCbm" type="number" step="0.1" min="0" defaultValue={initial?.sizeCbm ?? ''} placeholder={t('dashboard.sites.unitTypes.placeholderOptional')} style={inp} />
        </div>
        <div>
          <label style={lbl}>{t('dashboard.sites.unitTypes.labelDoor')}</label>
          <select name="doorType" defaultValue={initial?.doorType ?? ''} style={inp}>
            <option value="">{t('dashboard.sites.unitTypes.doorNone')}</option>
            {DOOR_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>{t('dashboard.sites.unitTypes.labelFeatures')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {FEATURE_KEYS.map(f => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedFeatures.includes(f.key)}
                onChange={() => toggleFeature(f.key)}
                style={{ width: '14px', height: '14px' }}
              />
              {t(`dashboard.sites.unitTypes.${f.i18n}`)}
            </label>
          ))}
        </div>
      </div>
      {error && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</p>}
      <div style={modal
        ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }
        : { display: 'flex', gap: '8px' }
      }>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? t('dashboard.sites.unitTypes.saving') : initial ? t('dashboard.sites.unitTypes.saveChanges') : t('dashboard.sites.unitTypes.addTypeButton')}
          </button>
          <button type="button" onClick={onCancel} style={btnGhost}>{t('dashboard.sites.unitTypes.cancel')}</button>
        </div>
        {modal && onDelete && (
          <button type="button" onClick={onDelete} disabled={deleteLoading}
            style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {deleteLoading ? t('dashboard.sites.unitTypes.deleting') : t('dashboard.sites.unitTypes.deleteType')}
          </button>
        )}
      </div>
    </form>
  );
}

export default function UnitTypesTab({ siteId, unitTypes, units, otherSites, canEdit }: Props) {
  const t = useT();
  const router = useRouter();
  const [showAdd, setShowAdd]           = useState(false);
  const [addLoading, setAddLoading]     = useState(false);
  const [addError, setAddError]         = useState('');
  const [editingType, setEditingType]   = useState<UnitType | null>(null);
  const [editLoading, setEditLoading]   = useState(false);
  const [editError, setEditError]       = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copyOpen, setCopyOpen]         = useState(false);
  const [copyLoading, setCopyLoading]   = useState(false);
  const [copyError, setCopyError]       = useState('');

  async function handleCreate(data: Omit<UnitType, 'id'>) {
    setAddLoading(true); setAddError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? t('dashboard.sites.unitTypes.errorFailed'));
      setShowAdd(false);
      router.refresh();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : t('dashboard.sites.unitTypes.errorFailed'));
    } finally { setAddLoading(false); }
  }

  async function handleEdit(data: Omit<UnitType, 'id'>) {
    if (!editingType) return;
    setEditLoading(true); setEditError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types/${editingType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? t('dashboard.sites.unitTypes.errorFailed'));
      setEditingType(null);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t('dashboard.sites.unitTypes.errorFailed'));
    } finally { setEditLoading(false); }
  }

  async function handleDelete() {
    if (!editingType || !confirm(t('dashboard.sites.unitTypes.confirmDelete', { name: editingType.name }))) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types/${editingType.id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? t('dashboard.sites.unitTypes.errorFailed')); }
      setEditingType(null);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t('dashboard.sites.unitTypes.errorFailed'));
      setDeleteLoading(false);
    }
  }

  async function handleCopyFrom(sourceSiteId: string) {
    setCopyLoading(true); setCopyError('');
    try {
      const res = await fetch(`/api/sites/${sourceSiteId}/unit-types`);
      const sourceTypes: UnitType[] = await res.json();
      if (!res.ok) throw new Error(t('dashboard.sites.unitTypes.errorFetchSource'));
      const existingNames = new Set(unitTypes.map(ut => ut.name.toLowerCase()));
      const toImport = sourceTypes.filter(ut => !existingNames.has(ut.name.toLowerCase()));
      await Promise.all(toImport.map(async ut => {
        const res = await fetch(`/api/sites/${siteId}/unit-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: ut.name, sizeSqm: ut.sizeSqm, sizeCbm: ut.sizeCbm, doorType: ut.doorType, features: ut.features }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? t('dashboard.sites.unitTypes.errorCopyFailed', { name: ut.name })); }
      }));
      setCopyOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : t('dashboard.sites.unitTypes.errorFailed'));
    } finally { setCopyLoading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {unitTypes.length === 1
            ? t('dashboard.sites.unitTypes.countLabel', { count: String(unitTypes.length) })
            : t('dashboard.sites.unitTypes.countLabel_plural', { count: String(unitTypes.length) })}
        </span>
        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {otherSites.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setCopyOpen(o => !o)} style={btnSecondary}>
                  {t('dashboard.sites.unitTypes.copyFrom')}
                </button>
                {copyOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(15,23,42,0.10)', zIndex: 10, minWidth: '180px', overflow: 'hidden' }}>
                    {otherSites.map(s => (
                      <button key={s.id} disabled={copyLoading} onClick={() => handleCopyFrom(s.id)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {s.name}
                      </button>
                    ))}
                    {copyError && <p style={{ padding: '8px 14px', fontSize: '12px', color: '#dc2626', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{copyError}</p>}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setShowAdd(true); setAddError(''); }} style={btnPrimary}>
              {t('dashboard.sites.unitTypes.addType')}
            </button>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <UnitTypeForm
          onSave={handleCreate}
          onCancel={() => setShowAdd(false)}
          loading={addLoading}
          error={addError}
        />
      )}

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        {unitTypes.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.sites.unitTypes.emptyTitle')}</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.sites.unitTypes.emptyBody')}</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {[t('dashboard.sites.unitTypes.columnName'), t('dashboard.sites.unitTypes.columnSize'), t('dashboard.sites.unitTypes.columnVolume'), t('dashboard.sites.unitTypes.columnDoor'), t('dashboard.sites.unitTypes.columnFeatures'), ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unitTypes.map((ut, i) => (
                <tr key={ut.id} onClick={() => { setEditingType(ut); setEditError(''); }} style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none', background: '#ffffff', cursor: 'pointer' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeSqm}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeCbm ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.doorType ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.features.join(', ') || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={e => { e.stopPropagation(); setEditingType(ut); setEditError(''); }} style={{ ...btnGhost, padding: '4px 8px', fontSize: '12px' }}>{t('dashboard.sites.unitTypes.edit')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Edit modal */}
      {editingType && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setEditingType(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(15,23,42,0.15)', padding: '24px', width: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.sites.unitTypes.editModalTitle')}</h3>
            {(() => { const inUse = units.some(u => u.unitType?.id === editingType.id); return (
              <UnitTypeForm
                initial={editingType}
                onSave={handleEdit}
                onCancel={() => setEditingType(null)}
                onDelete={inUse ? undefined : handleDelete}
                loading={editLoading}
                deleteLoading={deleteLoading}
                error={editError}
                modal
              />
            ); })()}
          </div>
        </div>
      )}
    </div>
  );
}
