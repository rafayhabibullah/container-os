'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CHECKLISTS } from './checklists';

interface ChecklistItem { code: string; label: string; result: 'pass' | 'fail' | 'na'; note: string; }

interface InspectionRow {
  id: string;
  siteId: string | null;
  siteName?: string | null;
  unitId: string;
  unitCode?: string | null;
  kind: string;
  result: string | null;
  checklist: { code: string; label: string; result: string; note?: string }[] | null;
  notes: string | null;
  depositDeduction: number | null;
  photoIds?: string[];
}

interface Props {
  inspection: InspectionRow;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  move_in: 'Move in',
  move_out: 'Move out',
  routine: 'Routine',
};

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

function normalizeChecklist(raw: InspectionRow['checklist'], kind: string): ChecklistItem[] {
  if (raw && raw.length > 0) {
    return raw.map((item) => ({
      code: item.code,
      label: item.label,
      result: (item.result as 'pass' | 'fail' | 'na') ?? 'na',
      note: item.note ?? '',
    }));
  }
  return (CHECKLISTS[kind] ?? CHECKLISTS.routine).map((item) => ({ ...item, result: 'na' as const, note: '' }));
}

export default function InspectionComplete({ inspection, onClose }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => normalizeChecklist(inspection.checklist, inspection.kind));
  const [notes, setNotes] = useState(inspection.notes ?? '');
  const [depositDeduction, setDepositDeduction] = useState(inspection.depositDeduction?.toString() ?? '');
  const [newPhotos, setNewPhotos] = useState<{ file: File; previewUrl: string; uploading: boolean; photoId: string | null }[]>([]);
  const existingPhotoCount = inspection.photoIds?.length ?? 0;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function updateChecklistItem(index: number, field: 'result' | 'note', value: string) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const added = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
      photoId: null as string | null,
    }));
    setNewPhotos((prev) => [...prev, ...added]);

    await Promise.all(added.map(async (item) => {
      try {
        const formData = new FormData();
        formData.append('file', item.file, item.file.name);
        const res = await fetch('/api/inspections/upload', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));
        setNewPhotos((prev) => {
          const idx = prev.findIndex((p) => p.file === item.file);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], uploading: false, photoId: data.photoId ?? null };
          return next;
        });
      } catch {
        setNewPhotos((prev) => {
          const idx = prev.findIndex((p) => p.file === item.file);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], uploading: false };
          return next;
        });
      }
    }));

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPhotos.some((p) => p.uploading)) {
      setError('Please wait for all photos to finish uploading.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/inspections/${inspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist,
          notes: notes || undefined,
          photoIds: [
            ...(inspection.photoIds ?? []),
            ...newPhotos.map((p) => p.photoId).filter(Boolean),
          ],
          depositDeduction: depositDeduction ? parseFloat(depositDeduction) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const allDone = checklist.every((i) => i.result !== 'na');
  const failCount = checklist.filter((i) => i.result === 'fail').length;
  const passCount = checklist.filter((i) => i.result === 'pass').length;

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes insp-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes insp-modal-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .insp-complete-backdrop { animation: insp-backdrop-in 0.18s ease both; }
        .insp-complete-card { animation: insp-modal-in 0.22s ease both; }
        .insp-complete-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
        .insp-complete-row:hover { background: #f8fafc; }
        .result-btn { border: 1px solid #e2e8f0; border-radius: 5px; padding: 3px 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.1s; }
        .result-btn.pass { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
        .result-btn.fail { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .result-btn.na   { background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }
        .result-btn.selected-pass { background: #16a34a; color: #fff; border-color: #16a34a; }
        .result-btn.selected-fail { background: #dc2626; color: #fff; border-color: #dc2626; }
        .result-btn.selected-na   { background: #94a3b8; color: #fff; border-color: #94a3b8; }
      `}</style>

      <div
        className="insp-complete-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)',
          zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '24px', overflowY: 'auto',
        }}
      >
        <div
          className="insp-complete-card"
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
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Complete inspection</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>Fill out the checklist to finish this inspection</p>
            </div>
            <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0 }}>✕</button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Read-only summary */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'SITE', value: inspection.siteName ?? (inspection.siteId ? inspection.siteId.slice(0, 8) + '…' : '—') },
                { label: 'UNIT', value: inspection.unitCode ?? inspection.unitId.slice(0, 8) + '…' },
                { label: 'TYPE', value: KIND_LABEL[inspection.kind] ?? inspection.kind },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', fontWeight: 700, color: '#94a3b8', margin: '0 0 2px', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Checklist */}
            {checklist.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>CHECKLIST</label>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#94a3b8' }}>
                    {passCount} pass · {failCount} fail · {checklist.length - passCount - failCount} pending
                  </span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {checklist.map((item, idx) => (
                    <div
                      key={item.code}
                      className="insp-complete-row"
                      style={{ padding: '10px 14px', borderBottom: idx < checklist.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.1s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#374151', flex: 1 }}>{item.label}</span>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          {(['pass', 'fail', 'na'] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              className={`result-btn ${item.result === v ? `selected-${v}` : v}`}
                              onClick={() => updateChecklistItem(idx, 'result', v)}
                            >
                              {v === 'na' ? 'N/A' : v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {item.result === 'fail' && (
                        <input
                          type="text"
                          placeholder="Note reason or details…"
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
                    Overall result: {failCount > 0 ? `Fail (${failCount} item${failCount > 1 ? 's' : ''})` : 'Pass — all items OK'}
                  </p>
                )}
              </div>
            )}

            {/* Photos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  PHOTOS <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  + Add photos
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} />
              {existingPhotoCount > 0 && (
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>
                  {existingPhotoCount} photo{existingPhotoCount > 1 ? 's' : ''} already attached
                </p>
              )}
              {newPhotos.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {newPhotos.map((p, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={p.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {p.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#64748b' }}>uploading…</span>
                        </div>
                      )}
                      {!p.uploading && (
                        <button type="button" onClick={() => removeNewPhoto(idx)} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(15,23,42,0.55)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '1px dashed #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
                >
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>Click to add more photos</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>NOTES <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional observations or comments…"
                rows={3}
                className="insp-complete-input"
                style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
              />
            </div>

            {/* Deposit deduction — move_out only */}
            {inspection.kind === 'move_out' && (
              <div>
                <label style={labelStyle}>DEPOSIT DEDUCTION <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional, €)</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositDeduction}
                  onChange={(e) => setDepositDeduction(e.target.value)}
                  placeholder="0.00"
                  className="insp-complete-input"
                  style={inputStyle}
                />
                {depositDeduction && parseFloat(depositDeduction) > 0 && (
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#f59e0b', margin: '4px 0 0' }}>
                    €{parseFloat(depositDeduction).toFixed(2)} will be noted for deposit deduction
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
                onClick={onClose}
                style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 2, background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', transition: 'background 0.15s' }}
              >
                {loading ? 'Saving…' : 'Complete inspection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
