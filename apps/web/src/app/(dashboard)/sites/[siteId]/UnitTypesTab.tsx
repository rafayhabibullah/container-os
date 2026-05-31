'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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

const FEATURES = [
  { key: 'climate_controlled', label: 'Climate controlled' },
  { key: 'ground_floor',       label: 'Ground floor'       },
  { key: 'top_floor',          label: 'Top floor'          },
  { key: 'drive_up',           label: 'Drive-up'           },
  { key: 'outdoor',            label: 'Outdoor'            },
  { key: 'alarmed',            label: 'Alarmed'            },
];

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
  loading,
  error,
}: {
  initial?: UnitType;
  onSave: (data: Omit<UnitType, 'id'>) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
        <div>
          <label style={lbl}>NAME</label>
          <input name="name" required defaultValue={initial?.name} placeholder="Small 5m²" style={inp} />
        </div>
        <div>
          <label style={lbl}>SIZE (M²)</label>
          <input name="sizeSqm" type="number" step="0.1" min="0.1" required defaultValue={initial?.sizeSqm} style={inp} />
        </div>
        <div>
          <label style={lbl}>VOLUME (M³)</label>
          <input name="sizeCbm" type="number" step="0.1" min="0" defaultValue={initial?.sizeCbm ?? ''} placeholder="optional" style={inp} />
        </div>
        <div>
          <label style={lbl}>DOOR</label>
          <select name="doorType" defaultValue={initial?.doorType ?? ''} style={inp}>
            <option value="">—</option>
            {DOOR_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>FEATURES</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {FEATURES.map(f => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedFeatures.includes(f.key)}
                onChange={() => toggleFeature(f.key)}
                style={{ width: '14px', height: '14px' }}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      {error && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving…' : initial ? 'Save changes' : 'Add type'}
        </button>
        <button type="button" onClick={onCancel} style={btnGhost}>Cancel</button>
      </div>
    </form>
  );
}

export default function UnitTypesTab({ siteId, unitTypes, units, otherSites, canEdit }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd]         = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [copyOpen, setCopyOpen]       = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError]     = useState('');

  async function handleCreate(data: Omit<UnitType, 'id'>) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      setShowAdd(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function handleEdit(id: string, data: Omit<UnitType, 'id'>) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      setEditingId(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete unit type "${name}"? This cannot be undone.`)) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types/${id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? 'Failed'); }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function handleCopyFrom(sourceSiteId: string) {
    setCopyLoading(true); setCopyError('');
    try {
      const res = await fetch(`/api/sites/${sourceSiteId}/unit-types`);
      const sourceTypes: UnitType[] = await res.json();
      if (!res.ok) throw new Error('Failed to fetch source unit types');
      const existingNames = new Set(unitTypes.map(ut => ut.name.toLowerCase()));
      const toImport = sourceTypes.filter(ut => !existingNames.has(ut.name.toLowerCase()));
      await Promise.all(toImport.map(async ut => {
        const res = await fetch(`/api/sites/${siteId}/unit-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: ut.name, sizeSqm: ut.sizeSqm, sizeCbm: ut.sizeCbm, doorType: ut.doorType, features: ut.features }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? `Failed to copy "${ut.name}"`); }
      }));
      setCopyOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : 'Failed');
    } finally { setCopyLoading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {unitTypes.length} type{unitTypes.length !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {otherSites.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setCopyOpen(o => !o)} style={btnSecondary}>
                  Copy from…
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
            <button onClick={() => { setShowAdd(true); setError(''); }} style={btnPrimary}>
              + Add type
            </button>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <UnitTypeForm
          onSave={handleCreate}
          onCancel={() => setShowAdd(false)}
          loading={loading}
          error={error}
        />
      )}

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        {unitTypes.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No unit types yet</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add types to define the sizes and features available at this site.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Name', 'Size (m²)', 'Volume (m³)', 'Door', 'Features', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unitTypes.map((ut, i) => (
                <React.Fragment key={ut.id}>
                  {editingId === ut.id ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '12px 16px', borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <UnitTypeForm
                          initial={ut}
                          onSave={(data) => handleEdit(ut.id, data)}
                          onCancel={() => setEditingId(null)}
                          loading={loading}
                          error={error}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none', background: '#ffffff' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeSqm}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeCbm ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.doorType ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.features.join(', ') || '—'}</td>
                      {canEdit && (
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => { setEditingId(ut.id); setError(''); }} style={{ ...btnGhost, padding: '4px 8px', fontSize: '12px' }}>Edit</button>
                          {(() => { const inUse = units.some(u => u.unitType?.id === ut.id); return (
                            <button
                              onClick={() => handleDelete(ut.id, ut.name)}
                              disabled={inUse || loading}
                              title={inUse ? 'Units reference this type' : undefined}
                              style={{ ...btnGhost, padding: '4px 8px', fontSize: '12px', color: inUse ? '#94a3b8' : '#dc2626', cursor: (inUse || loading) ? 'not-allowed' : 'pointer', opacity: (inUse || loading) ? 0.5 : 1 }}
                            >Delete</button>
                          ); })()}
                        </td>
                      )}
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
