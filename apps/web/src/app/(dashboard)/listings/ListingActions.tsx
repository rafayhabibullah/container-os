'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clientFetch } from '@/lib/client-api';
import { useT } from '@/lib/i18n';

interface Site {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitCode: string;
  status: string;
  kind: string;
}

interface Props {
  listingId: string;
  orgId: string;
  status: string;
  title: string;
  description: string | null;
  bookingMode: string;
  publicPriceMinor: number | null;
  showPrice: boolean;
  siteId: string;
  unitId: string;
  sites: Site[];
  images: string[];
}

const BOOKING_MODE_KEYS = ['approval_required', 'instant_booking', 'request_price'] as const;

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

export function ListingActions({ listingId, orgId, status, title, description, bookingMode, publicPriceMinor, showPrice, siteId, unitId, sites, images }: Props) {
  const router = useRouter();
  const t = useT();
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [showEdit,     setShowEdit]     = useState(false);
  const [editError,    setEditError]    = useState('');
  const [editLoading,  setEditLoading]  = useState(false);
  const [editSiteId,   setEditSiteId]   = useState(siteId);
  const [units,        setUnits]        = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError,     setImageError]     = useState('');

  useEffect(() => {
    if (!showEdit) return;
    setEditSiteId(siteId);
  }, [showEdit, siteId]);

  useEffect(() => {
    if (!editSiteId) { setUnits([]); return; }
    setUnitsLoading(true);
    fetch(`/api/sites/${editSiteId}/units`)
      .then((r) => r.json())
      .then((data: Unit[]) => setUnits(data.filter((u) => u.status === 'available' || u.id === unitId)))
      .catch(() => setUnits([]))
      .finally(() => setUnitsLoading(false));
  }, [editSiteId, unitId]);

  async function transition(action: 'publish' | 'pause' | 'archive') {
    setLoading(true);
    setError('');
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}/${action}`, { method: 'POST' });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('dashboard.listings.actions.failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    const form = new FormData(e.currentTarget);
    const priceRaw = form.get('publicPriceMinor') as string;
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          unitId:           form.get('unitId'),
          title:            form.get('title'),
          description:      (form.get('description') as string) || undefined,
          bookingMode:      form.get('bookingMode'),
          showPrice:        form.get('showPrice') === 'true',
          publicPriceMinor: priceRaw ? Math.round(parseFloat(priceRaw) * 100) : undefined,
        }),
      });
      router.refresh();
      setShowEdit(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : t('dashboard.listings.actions.failed'));
    } finally {
      setEditLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setImageError('');
    setImageUploading(true);
    try {
      for (const file of files) {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64 = dataUrl.split(',')[1];
        await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}/images`, {
          method: 'POST',
          body: JSON.stringify({ data: base64, contentType: file.type }),
        });
      }
      router.refresh();
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : t('dashboard.listings.actions.failed'));
    } finally {
      setImageUploading(false);
    }
  }

  async function handleImageRemove(url: string) {
    setImageError('');
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}/images/remove`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      router.refresh();
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : t('dashboard.listings.actions.failed'));
    }
  }

  async function handleImageReorder(images: string[]) {
    setImageError('');
    try {
      await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ images }),
      });
      router.refresh();
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : t('dashboard.listings.actions.failed'));
    }
  }

  function moveImage(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    handleImageReorder(next);
  }

  const btnStyle: React.CSSProperties = {
    padding: '5px 11px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#64748b',
    fontSize: '12px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.12s, color 0.12s',
  };

  const hover = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      const b = e.currentTarget;
      b.style.background = '#f1f5f9';
      b.style.color = '#0f172a';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      const b = e.currentTarget;
      b.style.background = '#f8fafc';
      b.style.color = '#64748b';
    },
  };

  const modal = showEdit ? createPortal(
    <>
      <style>{`
        @keyframes edit-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes edit-modal-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .edit-modal-backdrop { animation: edit-backdrop-in 0.18s ease both; }
        .edit-modal-card     { animation: edit-modal-in    0.22s ease both; }
        .edit-modal-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      <div
        className="edit-modal-backdrop"
        onClick={() => setShowEdit(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        <div
          className="edit-modal-card"
          onClick={(e) => e.stopPropagation()}
          style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{t('dashboard.listings.editModal.title')}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>{t('dashboard.listings.editModal.subtitle')}</p>
            </div>
            <button
              onClick={() => setShowEdit(false)}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleEdit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Site */}
            <div>
              <label style={labelStyle}>{t('dashboard.listings.editModal.site')}</label>
              <select
                value={editSiteId}
                onChange={(e) => setEditSiteId(e.target.value)}
                className="edit-modal-input"
                style={inputStyle}
              >
                <option value="">{t('dashboard.listings.editModal.selectSite')}</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label style={labelStyle}>{t('dashboard.listings.editModal.unit')}</label>
              <select name="unitId" required disabled={!editSiteId || unitsLoading} className="edit-modal-input" style={{ ...inputStyle, opacity: (!editSiteId || unitsLoading) ? 0.6 : 1 }} defaultValue={unitId}>
                <option value="">{unitsLoading ? t('dashboard.listings.editModal.loadingUnits') : !editSiteId ? t('dashboard.listings.editModal.selectSiteFirst') : units.length === 0 ? t('dashboard.listings.editModal.noAvailableUnits') : t('dashboard.listings.editModal.selectUnit')}</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.unitCode} ({u.kind.replace('_', ' ')})</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t('dashboard.listings.editModal.listingTitle')}</label>
              <input name="title" required defaultValue={title} className="edit-modal-input" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>{t('dashboard.listings.editModal.description')} <span style={{ color: '#cbd5e1', fontWeight: 400 }}>{t('dashboard.listings.editModal.optional')}</span></label>
              <textarea name="description" defaultValue={description ?? ''} rows={2} className="edit-modal-input" style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} />
            </div>

            <div>
              <label style={labelStyle}>{t('dashboard.listings.editModal.bookingMode')}</label>
              <select name="bookingMode" required defaultValue={bookingMode} className="edit-modal-input" style={inputStyle}>
                {BOOKING_MODE_KEYS.map((m) => <option key={m} value={m}>{t(`dashboard.listings.bookingModeFull.${m}`)}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>{t('dashboard.listings.editModal.pricePerMonth')} <span style={{ color: '#cbd5e1', fontWeight: 400 }}>{t('dashboard.listings.editModal.opt')}</span></label>
                <input
                  name="publicPriceMinor"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={publicPriceMinor != null ? (publicPriceMinor / 100).toFixed(2) : ''}
                  className="edit-modal-input"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ ...labelStyle, marginBottom: '10px' }}>
                  <input type="checkbox" name="showPrice" value="true" defaultChecked={showPrice} style={{ marginRight: '6px' }} />
                  {t('dashboard.listings.editModal.showPricePublicly')}
                </label>
              </div>
            </div>

            <div>
              <label style={labelStyle}>{t('dashboard.listings.editModal.images')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                {images.map((url, idx) => (
                  <div key={url} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: idx === 0 ? '2px solid #0f172a' : '1px solid #e2e8f0' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleImageRemove(url)}
                      style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', border: 'none', background: 'rgba(15,23,42,0.7)', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    >
                      ✕
                    </button>
                    <div style={{ position: 'absolute', bottom: '2px', left: '2px', right: '2px', display: 'flex', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, -1)}
                        disabled={idx === 0}
                        style={{ width: '16px', height: '16px', borderRadius: '4px', border: 'none', background: 'rgba(15,23,42,0.7)', color: '#fff', fontSize: '10px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 1)}
                        disabled={idx === images.length - 1}
                        style={{ width: '16px', height: '16px', borderRadius: '4px', border: 'none', background: 'rgba(15,23,42,0.7)', color: '#fff', fontSize: '10px', cursor: idx === images.length - 1 ? 'default' : 'pointer', opacity: idx === images.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                ))}
                <label
                  style={{
                    width: '64px', height: '64px', borderRadius: '8px', border: '1px dashed #cbd5e1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: imageUploading ? 'not-allowed' : 'pointer',
                    color: '#94a3b8', fontSize: '20px', flexShrink: 0,
                  }}
                >
                  {imageUploading ? '…' : '+'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleImageUpload} disabled={imageUploading} style={{ display: 'none' }} />
                </label>
              </div>
              {imageError && <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 8px' }}>{imageError}</p>}
            </div>

            {editError && (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
                {editError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '2px' }}>
              <button type="button" onClick={() => setShowEdit(false)} style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px' }}>
                {t('dashboard.listings.editModal.cancel')}
              </button>
              <button type="submit" disabled={editLoading} style={{ flex: 2, background: editLoading ? '#e2e8f0' : '#0f172a', color: editLoading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px', cursor: editLoading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', transition: 'background 0.15s' }}>
                {editLoading ? t('dashboard.listings.editModal.saving') : t('dashboard.listings.editModal.saveChanges')}
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
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button onClick={() => { setEditError(''); setShowEdit(true); }} disabled={loading} style={btnStyle} {...hover}>
          {t('dashboard.listings.actions.edit')}
        </button>
        {(status === 'draft' || status === 'paused') && (
          <button onClick={() => transition('publish')} disabled={loading} style={btnStyle} {...hover}>
            {t('dashboard.listings.actions.publish')}
          </button>
        )}
        {status === 'published' && (
          <button onClick={() => transition('pause')} disabled={loading} style={btnStyle} {...hover}>
            {t('dashboard.listings.actions.pause')}
          </button>
        )}
        {status !== 'archived' && (
          <button onClick={() => transition('archive')} disabled={loading} style={btnStyle} {...hover}>
            {t('dashboard.listings.actions.archive')}
          </button>
        )}
        {error && (
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#dc2626' }}>
            {error}
          </span>
        )}
      </div>
      {modal}
    </>
  );
}
