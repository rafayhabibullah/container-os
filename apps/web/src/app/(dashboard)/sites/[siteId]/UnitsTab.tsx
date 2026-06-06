'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { UnitType } from './UnitTypesTab';

interface Unit {
  id: string;
  unitCode: string;
  kind: string;
  status: string;
  driveUp: boolean;
  unitType: UnitType;
}

interface SiteSummary { id: string; name: string; }

interface Props {
  siteId: string;
  unitTypes: UnitType[];
  units: Unit[];
  otherSites: SiteSummary[];
  canEdit: boolean;
}

const UNIT_STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  available:      { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Available'      },
  reserved:       { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Reserved'       },
  occupied:       { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Occupied'       },
  maintenance:    { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Maintenance'    },
  out_of_service: { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Out of service' },
};

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0f172a', outline: 'none', boxSizing: 'border-box',
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

export default function UnitsTab({ siteId, unitTypes, units, otherSites, canEdit }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd]         = useState(false);
  const [showBulk, setShowBulk]       = useState(false);
  const [addLoading, setAddLoading]   = useState(false);
  const [addError, setAddError]       = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError]     = useState('');
  const [bulkProgress, setBulkProgress] = useState('');
  const [copyOpen, setCopyOpen]       = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError]     = useState('');

  // Edit modal state
  const [editUnit, setEditUnit]       = useState<Unit | null>(null);
  const [editCode, setEditCode]       = useState('');
  const [editStatus, setEditStatus]   = useState('');
  const [editDriveUp, setEditDriveUp] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  function openEdit(unit: Unit) {
    setEditUnit(unit);
    setEditCode(unit.unitCode);
    setEditStatus(unit.status);
    setEditDriveUp(unit.driveUp);
    setEditError('');
  }

  async function handleEditSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUnit) return;
    setEditLoading(true); setEditError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${editUnit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitCode: editCode, driveUp: editDriveUp, status: editStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update unit');
      setEditUnit(null);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed');
    } finally { setEditLoading(false); }
  }

  async function handleDeleteUnit() {
    if (!editUnit || !confirm(`Delete unit ${editUnit.unitCode}?`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${editUnit.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Failed'); }
      setEditUnit(null);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed');
      setDeleteLoading(false);
    }
  }

  // Bulk generator state
  const [bulkTypeId, setBulkTypeId]   = useState(unitTypes[0]?.id ?? '');
  const [bulkPrefix, setBulkPrefix]   = useState('A-');
  const [bulkStart, setBulkStart]     = useState(101);
  const [bulkCount, setBulkCount]     = useState(10);
  const [bulkKind, setBulkKind]       = useState('self_storage');
  const [bulkDriveUp, setBulkDriveUp] = useState(false);

  const bulkPreview = bulkCount > 0
    ? `Will create: ${bulkPrefix}${bulkStart}, ${bulkPrefix}${bulkStart + 1} … ${bulkPrefix}${bulkStart + bulkCount - 1}`
    : '';

  async function handleAddSingle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true); setAddError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode:   form.get('unitCode'),
          unitTypeId: form.get('unitTypeId'),
          kind:       form.get('kind'),
          driveUp:    (e.currentTarget.elements.namedItem('driveUp') as HTMLInputElement)?.checked ?? false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      setShowAdd(false);
      router.refresh();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed');
    } finally { setAddLoading(false); }
  }

  async function handleBulkGenerate() {
    if (!bulkTypeId || bulkCount < 1) return;
    setBulkLoading(true); setBulkError(''); setBulkProgress('');
    const codes = Array.from({ length: bulkCount }, (_, i) => `${bulkPrefix}${bulkStart + i}`);
    let done = 0;
    try {
      for (const unitCode of codes) {
        const res = await fetch(`/api/sites/${siteId}/units`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitCode, unitTypeId: bulkTypeId, kind: bulkKind, driveUp: bulkDriveUp }),
        });
        if (!res.ok) {
          const j = await res.json();
          const code = j?.error?.message ?? j?.message;
          const msg = code === 'UNIT_CODE_ALREADY_EXISTS' ? `Unit ${unitCode} already exists` : (code ?? `Failed for ${unitCode}`);
          throw new Error(msg);
        }
        done++;
        setBulkProgress(`Creating ${done} / ${codes.length}…`);
      }
      setShowBulk(false); setBulkProgress('');
      router.refresh();
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Failed');
    } finally { setBulkLoading(false); }
  }

  async function handleCopyFrom(sourceSiteId: string) {
    setCopyLoading(true); setCopyError('');
    try {
      const res = await fetch(`/api/sites/${sourceSiteId}/units`);
      if (!res.ok) throw new Error('Failed to fetch source units');
      const sourceUnits: Unit[] = await res.json();
      const existingCodes = new Set(units.map(u => u.unitCode));
      const toImport = sourceUnits.filter(u => !existingCodes.has(u.unitCode));
      // Map source unitTypeId → name, then match to current site by name
      const sourceTypeRes = await fetch(`/api/sites/${sourceSiteId}/unit-types`);
      const sourceTypes: UnitType[] = await sourceTypeRes.json();
      const sourceTypeMap = new Map(sourceTypes.map(t => [t.id, t.name]));
      const currentTypeByName = new Map(unitTypes.map(t => [t.name.toLowerCase(), t.id]));
      await Promise.all(toImport.map(u => {
        const typeName = sourceTypeMap.get(u.unitType?.id ?? '') ?? '';
        const mappedTypeId = currentTypeByName.get(typeName.toLowerCase());
        if (!mappedTypeId) return Promise.resolve(); // skip if no matching type
        return fetch(`/api/sites/${siteId}/units`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitCode: u.unitCode, unitTypeId: mappedTypeId, kind: u.kind, driveUp: u.driveUp }),
        });
      }));
      setCopyOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : 'Failed');
    } finally { setCopyLoading(false); }
  }

  // Group units by unit type
  const grouped = unitTypes.map(ut => ({
    type: ut,
    units: units.filter(u => u.unitType?.id === ut.id),
  })).filter(g => g.units.length > 0);
  const untyped = units.filter(u => !unitTypes.some(ut => ut.id === u.unitType?.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {units.length} unit{units.length !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {otherSites.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setCopyOpen(o => !o)} style={btnSecondary}>Copy from…</button>
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
            <button onClick={() => { setShowBulk(o => !o); setShowAdd(false); }} style={btnSecondary}>Generate units</button>
            <button onClick={() => { setShowAdd(o => !o); setShowBulk(false); setAddError(''); }} style={btnPrimary}>+ Add unit</button>
          </div>
        )}
      </div>

      {/* Single add form */}
      {showAdd && (
        <form onSubmit={handleAddSingle} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ flex: '0 0 120px' }}>
            <label style={lbl}>UNIT CODE</label>
            <input name="unitCode" required placeholder="A-101" style={inp} />
          </div>
          <div style={{ flex: '0 0 200px' }}>
            <label style={lbl}>UNIT TYPE</label>
            <select name="unitTypeId" required style={inp}>
              <option value="">Select…</option>
              {unitTypes.map(ut => <option key={ut.id} value={ut.id}>{ut.name} ({ut.sizeSqm}m²)</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 150px' }}>
            <label style={lbl}>KIND</label>
            <select name="kind" style={inp}>
              <option value="self_storage">Self Storage</option>
              <option value="container">Container</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '2px' }}>
            <input name="driveUp" type="checkbox" id="driveUpSingle" style={{ width: '14px', height: '14px' }} />
            <label htmlFor="driveUpSingle" style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Drive-up</label>
          </div>
          <button type="submit" disabled={addLoading} style={{ ...btnPrimary, opacity: addLoading ? 0.6 : 1 }}>
            {addLoading ? 'Creating…' : 'Add unit'}
          </button>
          <button type="button" onClick={() => setShowAdd(false)} style={btnGhost}>Cancel</button>
          {addError && <p style={{ width: '100%', fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{addError}</p>}
        </form>
      )}

      {/* Bulk generator */}
      {showBulk && (
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 200px' }}>
              <label style={lbl}>UNIT TYPE</label>
              <select value={bulkTypeId} onChange={e => setBulkTypeId(e.target.value)} style={inp}>
                {unitTypes.map(ut => <option key={ut.id} value={ut.id}>{ut.name} ({ut.sizeSqm}m²)</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 100px' }}>
              <label style={lbl}>PREFIX</label>
              <input value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} placeholder="A-" style={inp} />
            </div>
            <div style={{ flex: '0 0 90px' }}>
              <label style={lbl}>START #</label>
              <input type="number" min="1" value={bulkStart} onChange={e => setBulkStart(parseInt(e.target.value) || 1)} style={inp} />
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <label style={lbl}>COUNT</label>
              <input type="number" min="1" max="200" value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value) || 1)} style={inp} />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label style={lbl}>KIND</label>
              <select value={bulkKind} onChange={e => setBulkKind(e.target.value)} style={inp}>
                <option value="self_storage">Self Storage</option>
                <option value="container">Container</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '2px' }}>
              <input type="checkbox" id="bulkDriveUp" checked={bulkDriveUp} onChange={e => setBulkDriveUp(e.target.checked)} style={{ width: '14px', height: '14px' }} />
              <label htmlFor="bulkDriveUp" style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Drive-up</label>
            </div>
          </div>
          {bulkPreview && (
            <p style={{ fontSize: '12px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px' }}>
              {bulkProgress || bulkPreview}
            </p>
          )}
          {bulkError && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{bulkError}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleBulkGenerate} disabled={bulkLoading || bulkCount < 1 || !bulkTypeId} style={{ ...btnPrimary, opacity: (bulkLoading || bulkCount < 1) ? 0.6 : 1, cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>
              {bulkLoading ? bulkProgress || 'Generating…' : `Generate ${bulkCount} units`}
            </button>
            <button onClick={() => setShowBulk(false)} style={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {units.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No units yet</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add individual units or use the generator to create them in bulk.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Code', 'Kind', 'Drive-up', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ type, units: typeUnits }) => (
                <React.Fragment key={type.id}>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td colSpan={5} style={{ padding: '7px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {type.name} ({type.sizeSqm}m²) — {typeUnits.length} unit{typeUnits.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                  {typeUnits.map((unit, i) => {
                    const stat = UNIT_STATUS[unit.status] ?? { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: unit.status };
                    return (
                      <tr key={unit.id} onClick={() => openEdit(unit)} style={{ borderBottom: i < typeUnits.length - 1 ? '1px solid #f8fafc' : '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{unit.unitCode}</td>
                        <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>{unit.kind.replace('_', ' ')}</td>
                        <td style={{ padding: '11px 16px', fontSize: '13px', color: unit.driveUp ? '#15803d' : '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{unit.driveUp ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block', flexShrink: 0 }} />
                            {stat.label}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                          <button onClick={e => { e.stopPropagation(); openEdit(unit); }} style={{ ...btnGhost, padding: '4px 8px' }}>Edit →</button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              {untyped.map((unit, i) => {
                const stat = UNIT_STATUS[unit.status] ?? { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: unit.status };
                return (
                  <tr key={unit.id} onClick={() => openEdit(unit)} style={{ borderBottom: i < untyped.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer' }}>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{unit.unitCode}</td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>{unit.kind.replace('_', ' ')}</td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: unit.driveUp ? '#15803d' : '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{unit.driveUp ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block', flexShrink: 0 }} />
                        {stat.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <button onClick={e => { e.stopPropagation(); openEdit(unit); }} style={{ ...btnGhost, padding: '4px 8px' }}>Edit →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Edit modal */}
      {editUnit && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setEditUnit(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(15,23,42,0.15)', padding: '24px', width: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit unit</h3>
            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>UNIT CODE</label>
                <input value={editCode} onChange={e => setEditCode(e.target.value)} required style={{ ...inp, width: '100%' }} />
              </div>
              <div>
                <label style={lbl}>STATUS</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ ...inp, width: '100%' }}>
                  {['available', 'maintenance', 'out_of_service'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="editDriveUp" checked={editDriveUp} onChange={e => setEditDriveUp(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="editDriveUp" style={{ fontSize: '14px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>Drive-up access</label>
              </div>
              {editError && (
                <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{editError}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={editLoading} style={{ ...btnPrimary, opacity: editLoading ? 0.6 : 1 }}>
                    {editLoading ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setEditUnit(null)} style={btnGhost}>Cancel</button>
                </div>
                <button type="button" onClick={handleDeleteUnit} disabled={deleteLoading}
                  style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {deleteLoading ? 'Deleting…' : 'Delete unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
