'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useT } from '@/lib/i18n';
import { CHECKLISTS } from './checklists';

interface Site { id: string; name: string; }
interface Unit { id: string; unitCode: string; }
interface Contract { id: string; status: string; effectiveFrom: string | null; }
interface ChecklistItem { code: string; i18nKey: string; result: 'pass' | 'fail' | 'na'; note: string; }

interface Props { sites?: Site[]; }

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
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

function buildChecklist(kind: string): ChecklistItem[] {
  return (CHECKLISTS[kind] ?? CHECKLISTS.routine).map((item) => ({
    code: item.code,
    i18nKey: item.i18nKey,
    result: 'na' as const,
    note: '',
  }));
}

export default function InspectionActions({ sites = [] }: Props) {
  const t = useT();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [showForm,         setShowForm]         = useState(false);
  const [mounted,          setMounted]          = useState(false);
  const [units,            setUnits]            = useState<Unit[]>([]);
  const [unitsLoading,     setUnitsLoading]     = useState(false);
  const [contracts,        setContracts]        = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [kind,             setKind]             = useState('move_in');
  const [checklist,        setChecklist]        = useState<ChecklistItem[]>(() => buildChecklist('move_in'));
  const [notes,            setNotes]            = useState('');
  const [depositDeduction, setDepositDeduction] = useState('');
  const [photos,           setPhotos]           = useState<{ file: File; previewUrl: string; uploading: boolean; photoId: string | null }[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showForm]);

  function closeModal() {
    setShowForm(false);
    setUnits([]);
    setContracts([]);
    setError('');
    setNotes('');
    setDepositDeduction('');
    setKind('move_in');
    setChecklist(buildChecklist('move_in'));
    setPhotos([]);
  }

  function onKindChange(newKind: string) {
    setKind(newKind);
    setChecklist(buildChecklist(newKind));
  }

  async function onSiteChange(siteId: string) {
    setUnits([]);
    setContracts([]);
    if (!siteId) return;
    setUnitsLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/units`);
      if (res.ok) setUnits(await res.json());
    } finally {
      setUnitsLoading(false);
    }
  }

  async function onUnitChange(unitId: string) {
    setContracts([]);
    if (!unitId) return;
    setContractsLoading(true);
    try {
      const res = await fetch(`/api/units/${unitId}/contracts`);
      if (res.ok) {
        const all: Contract[] = await res.json();
        setContracts(all.filter((c) => ['active', 'pending_signature', 'signed_by_tenant', 'countersigned'].includes(c.status)));
      }
    } finally {
      setContractsLoading(false);
    }
  }

  function updateChecklistItem(index: number, field: 'result' | 'note', value: string) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newPhotos = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
      photoId: null as string | null,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);

    // Upload each file immediately
    await Promise.all(newPhotos.map(async (item) => {
      try {
        const formData = new FormData();
        formData.append('file', item.file, item.file.name);
        const res = await fetch('/api/inspections/upload', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));
        const photoId = data.photoId ?? null;
        setPhotos((prev) => {
          const idx = prev.findIndex((p) => p.file === item.file);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], uploading: false, photoId };
          return next;
        });
      } catch {
        setPhotos((prev) => {
          const idx = prev.findIndex((p) => p.file === item.file);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], uploading: false };
          return next;
        });
      }
    }));

    // Reset the input so the same file can be re-added
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (photos.some((p) => p.uploading)) {
      setError(t('dashboard.inspections.form.waitForPhotos'));
      return;
    }
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId:          form.get('siteId'),
          unitId:          form.get('unitId'),
          kind,
          checklist: checklist.map(({ code, i18nKey, result, note }) => ({
            code,
            label: t(`dashboard.inspections.checklist.${i18nKey}`),
            result,
            note,
          })),
          photoIds:        photos.map((p) => p.photoId).filter(Boolean),
          notes:           notes || undefined,
          contractId:      form.get('contractId') || undefined,
          depositDeduction: depositDeduction ? parseFloat(depositDeduction) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? t('dashboard.inspections.form.failed'));
      router.refresh();
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.inspections.form.failed'));
    } finally {
      setLoading(false);
    }
  }

  const allDone     = checklist.every((i) => i.result !== 'na');
  const failCount   = checklist.filter((i) => i.result === 'fail').length;
  const passCount   = checklist.filter((i) => i.result === 'pass').length;
  const showDeposit = kind === 'move_out';

  const modal = mounted && showForm ? createPortal(
    <>
      <style>{`
        @keyframes insp-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes insp-modal-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .insp-modal-backdrop { animation: insp-backdrop-in 0.18s ease both; }
        .insp-modal-card     { animation: insp-modal-in    0.22s ease both; }
        .insp-modal-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
        .checklist-row:hover { background: #f8fafc; }
        .result-btn { border: 1px solid #e2e8f0; border-radius: 5px; padding: 3px 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.1s; }
        .result-btn.pass { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
        .result-btn.fail { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .result-btn.na   { background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }
        .result-btn.selected-pass { background: #16a34a; color: #fff; border-color: #16a34a; }
        .result-btn.selected-fail { background: #dc2626; color: #fff; border-color: #dc2626; }
        .result-btn.selected-na   { background: #94a3b8; color: #fff; border-color: #94a3b8; }
      `}</style>

      <div
        className="insp-modal-backdrop"
        onClick={closeModal}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)',
          zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '24px', overflowY: 'auto',
        }}
      >
        <div
          className="insp-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff', borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)',
            width: '100%', maxWidth: '520px',
            marginTop: '20px', marginBottom: '24px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{t('dashboard.inspections.form.heading')}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>{t('dashboard.inspections.form.subheading')}</p>
            </div>
            <button onClick={closeModal} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0 }}>✕</button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Site */}
            <div>
              <label style={labelStyle}>{t('dashboard.inspections.form.site')}</label>
              <select name="siteId" required className="insp-modal-input" style={inputStyle} onChange={(e) => onSiteChange(e.target.value)}>
                <option value="">{t('dashboard.inspections.form.selectSite')}</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label style={labelStyle}>{t('dashboard.inspections.form.unit')}</label>
              <select name="unitId" required disabled={units.length === 0} className="insp-modal-input" style={{ ...inputStyle, opacity: units.length === 0 ? 0.5 : 1 }} onChange={(e) => onUnitChange(e.target.value)}>
                <option value="">{unitsLoading ? t('dashboard.inspections.form.loadingUnits') : units.length === 0 ? t('dashboard.inspections.form.selectSiteFirst') : t('dashboard.inspections.form.selectUnit')}</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.unitCode}</option>)}
              </select>
            </div>

            {/* Kind */}
            <div>
              <label style={labelStyle}>{t('dashboard.inspections.form.type')}</label>
              <select name="kind" className="insp-modal-input" style={inputStyle} value={kind} onChange={(e) => onKindChange(e.target.value)}>
                <option value="move_in">{t('dashboard.inspections.form.typeMoveIn')}</option>
                <option value="move_out">{t('dashboard.inspections.form.typeMoveOut')}</option>
                <option value="routine">{t('dashboard.inspections.form.typeRoutine')}</option>
              </select>
            </div>

            {/* Contract (Fix 3) */}
            <div>
              <label style={labelStyle}>{t('dashboard.inspections.form.contract')} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t('dashboard.inspections.form.optional')}</span></label>
              <select name="contractId" className="insp-modal-input" style={{ ...inputStyle, opacity: contracts.length === 0 ? 0.6 : 1 }}>
                <option value="">{contractsLoading ? t('dashboard.inspections.form.loadingContracts') : contracts.length === 0 ? t('dashboard.inspections.form.noContracts') : t('dashboard.inspections.form.selectContract')}</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id.slice(0, 8)}… · {c.status.replace(/_/g, ' ')} {c.effectiveFrom ? t('dashboard.inspections.form.fromDate', { date: new Date(c.effectiveFrom).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) }) : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Structured Checklist (Fix 1) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{t('dashboard.inspections.form.checklist')}</label>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#94a3b8' }}>
                  {t('dashboard.inspections.form.passFailPending', { pass: String(passCount), fail: String(failCount), pending: String(checklist.length - passCount - failCount) })}
                </span>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {checklist.map((item, idx) => (
                  <div
                    key={item.code}
                    className="checklist-row"
                    style={{ padding: '10px 14px', borderBottom: idx < checklist.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.1s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#374151', flex: 1 }}>{t(`dashboard.inspections.checklist.${item.i18nKey}`)}</span>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {(['pass', 'fail', 'na'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            className={`result-btn ${item.result === v ? `selected-${v}` : v}`}
                            onClick={() => updateChecklistItem(idx, 'result', v)}
                          >
                            {v === 'na' ? t('dashboard.inspections.form.naLabel') : t(`dashboard.inspections.form.resultBtn${v.charAt(0).toUpperCase() + v.slice(1)}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {item.result === 'fail' && (
                      <input
                        type="text"
                        placeholder={t('dashboard.inspections.form.notePlaceholder')}
                        value={item.note}
                        onChange={(e) => updateChecklistItem(idx, 'note', e.target.value)}
                        style={{ ...inputStyle, marginTop: '8px', fontSize: '13px', padding: '7px 10px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
              {allDone && (
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: failCount > 0 ? '#dc2626' : '#16a34a', margin: '6px 0 0', fontWeight: 600 }}>
                  {t('dashboard.inspections.form.overallResult', {
                    result: failCount > 0
                      ? t(`dashboard.inspections.form.${failCount > 1 ? 'resultFailPlural' : 'resultFail'}`, { count: String(failCount) })
                      : t('dashboard.inspections.form.resultPass'),
                  })}
                </p>
              )}
            </div>

            {/* Photos (Fix 4) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{t('dashboard.inspections.form.photos')} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t('dashboard.inspections.form.optional')}</span></label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {t('dashboard.inspections.form.addPhotos')}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} />
              {photos.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {photos.map((p, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <Image src={p.previewUrl} alt="" fill sizes="72px" unoptimized style={{ objectFit: 'cover' }} />
                      {p.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#64748b' }}>{t('dashboard.inspections.form.uploading')}</span>
                        </div>
                      )}
                      {!p.uploading && (
                        <button type="button" onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(15,23,42,0.55)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '1px dashed #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
                >
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t('dashboard.inspections.form.clickToAddPhotos')}</p>
                </div>
              )}
            </div>

            {/* Notes (Fix 2) */}
            <div>
              <label style={labelStyle}>{t('dashboard.inspections.form.notes')} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t('dashboard.inspections.form.optional')}</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('dashboard.inspections.form.notesPlaceholder')}
                rows={3}
                className="insp-modal-input"
                style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
              />
            </div>

            {/* Deposit deduction — move_out only (Fix 6) */}
            {showDeposit && (
              <div>
                <label style={labelStyle}>{t('dashboard.inspections.form.depositDeduction')} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{t('dashboard.inspections.form.optionalEuro')}</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositDeduction}
                  onChange={(e) => setDepositDeduction(e.target.value)}
                  placeholder="0.00"
                  className="insp-modal-input"
                  style={inputStyle}
                />
                {depositDeduction && parseFloat(depositDeduction) > 0 && (
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#f59e0b', margin: '4px 0 0' }}>
                    {t('dashboard.inspections.form.depositNote', { amount: parseFloat(depositDeduction).toFixed(2) })}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '2px' }}>
              <button
                type="button"
                onClick={closeModal}
                style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px' }}
              >
                {t('dashboard.inspections.form.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 2, background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', transition: 'background 0.15s' }}
              >
                {loading ? t('dashboard.inspections.form.saving') : t('dashboard.inspections.form.submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={() => { setError(''); setShowForm(true); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#0f172a', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', boxShadow: '0 1px 2px rgba(15,23,42,0.15)', whiteSpace: 'nowrap' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {t('dashboard.inspections.newInspection')}
      </button>
      {modal}
    </>
  );
}
