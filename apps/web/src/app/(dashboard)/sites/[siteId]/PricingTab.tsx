'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import type { UnitType } from './UnitTypesTab';

interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface SiteSummary { id: string; name: string; }

interface Props {
  siteId: string;
  unitTypes: UnitType[];
  priceBooks: PriceBook[];
  otherSites: SiteSummary[];
  canEdit: boolean;
}

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0f172a', outline: 'none', boxSizing: 'border-box',
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

type RateMap = Record<string, { amountEur: string; billingCycle: string }>;

function buildInitialRates(unitTypes: UnitType[], publishedBook: PriceBook | undefined): RateMap {
  const map: RateMap = {};
  for (const ut of unitTypes) {
    const rule = publishedBook?.rules.find(r => r.unitTypeId === ut.id);
    map[ut.id] = {
      amountEur:    rule ? (rule.amountMinor / 100).toFixed(2) : '',
      billingCycle: rule?.billingCycle ?? 'monthly',
    };
  }
  return map;
}

export default function PricingTab({ siteId, unitTypes, priceBooks, otherSites, canEdit }: Props) {
  const t = useT();
  const router = useRouter();
  const publishedBook = priceBooks.find(pb => pb.status === 'published');
  const scheduledBook = priceBooks.find(pb => pb.status === 'draft' && new Date(pb.effectiveFrom) > new Date());

  const [editing, setEditing]           = useState(false);
  const [scheduling, setScheduling]     = useState(false);
  const [rates, setRates]               = useState<RateMap>(() => buildInitialRates(unitTypes, publishedBook));
  const [schedRates, setSchedRates]     = useState<RateMap>(() => buildInitialRates(unitTypes, publishedBook));
  const [schedDate, setSchedDate]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [copyOpen, setCopyOpen]         = useState(false);
  const [copyLoading, setCopyLoading]   = useState(false);
  const [copyError, setCopyError]       = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  async function createBookWithRules(
    name: string,
    effectiveFrom: string,
    rateMap: RateMap,
    publish: boolean,
  ) {
    // 1. Create price book
    const bookRes = await fetch(`/api/sites/${siteId}/price-books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, effectiveFrom }),
    });
    const bookJson = await bookRes.json();
    if (!bookRes.ok) throw new Error(bookJson.message ?? t('dashboard.sites.pricing.errorCreateBook'));
    const bookId: string = bookJson.id;

    // 2. Add rate rules
    await Promise.all(
      unitTypes
        .filter(ut => rateMap[ut.id]?.amountEur)
        .map(ut =>
          fetch(`/api/sites/${siteId}/price-books/${bookId}/rate-rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unitTypeId:   ut.id,
              amountMinor:  Math.round(parseFloat(rateMap[ut.id].amountEur) * 100),
              billingCycle: rateMap[ut.id].billingCycle,
            }),
          }),
        ),
    );

    // 3. Publish immediately if requested
    if (publish) {
      const pubRes = await fetch(`/api/sites/${siteId}/price-books/${bookId}/publish`, { method: 'POST' });
      if (!pubRes.ok) { const j = await pubRes.json(); throw new Error(j.message ?? t('dashboard.sites.pricing.errorPublish')); }
    }
  }

  async function handleSaveNow() {
    setSaving(true); setSaveError('');
    try {
      const now = new Date().toISOString().split('T')[0];
      await createBookWithRules(`Rate update ${now}`, now, rates, true);
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t('dashboard.sites.pricing.errorFailed'));
    } finally { setSaving(false); }
  }

  async function handleSchedule() {
    if (!schedDate) { setSaveError(t('dashboard.sites.pricing.errorPickDate')); return; }
    setSaving(true); setSaveError('');
    try {
      await createBookWithRules(`Scheduled update ${schedDate}`, schedDate, schedRates, false);
      setScheduling(false);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t('dashboard.sites.pricing.errorFailed'));
    } finally { setSaving(false); }
  }

  async function handleCancelScheduled() {
    if (!scheduledBook) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/price-books/${scheduledBook.id}/archive`, { method: 'POST' });
      if (!res.ok) { const j = await res.json(); setSaveError(j.message ?? t('dashboard.sites.pricing.errorCancelScheduled')); return; }
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t('dashboard.sites.pricing.errorFailed'));
    } finally { setCancelLoading(false); }
  }

  async function handleCopyFrom(sourceSiteId: string) {
    setCopyLoading(true); setCopyError('');
    try {
      const [pbRes, utRes] = await Promise.all([
        fetch(`/api/sites/${sourceSiteId}/price-books`),
        fetch(`/api/sites/${sourceSiteId}/unit-types`),
      ]);
      if (!pbRes.ok || !utRes.ok) throw new Error(t('dashboard.sites.pricing.errorFetchSource'));
      const sourceBooks: PriceBook[] = await pbRes.json();
      const sourceTypes: UnitType[]  = await utRes.json();

      const sourcePublished = sourceBooks.find(pb => pb.status === 'published');
      if (!sourcePublished) throw new Error(t('dashboard.sites.pricing.errorNoPublishedSource'));

      const sourceTypeById = new Map(sourceTypes.map(t => [t.id, t.name]));
      const currentTypeByName = new Map(unitTypes.map(t => [t.name.toLowerCase(), t.id]));

      const newRates: RateMap = { ...rates };
      const unmatched: string[] = [];

      for (const rule of sourcePublished.rules) {
        const sourceName = sourceTypeById.get(rule.unitTypeId);
        if (!sourceName) continue;
        const currentId = currentTypeByName.get(sourceName.toLowerCase());
        if (currentId) {
          newRates[currentId] = {
            amountEur:    (rule.amountMinor / 100).toFixed(2),
            billingCycle: rule.billingCycle,
          };
        } else {
          unmatched.push(sourceName);
        }
      }

      setRates(newRates);
      setEditing(true);
      setCopyOpen(false);
      if (unmatched.length > 0) {
        setCopyError(t('dashboard.sites.pricing.errorNoMatch', { names: unmatched.join(', ') }));
      }
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : t('dashboard.sites.pricing.errorFailed'));
    } finally { setCopyLoading(false); }
  }

  const displayRates = editing ? rates : buildInitialRates(unitTypes, publishedBook);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Scheduled change notice */}
      {scheduledBook && !scheduling && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#92400e', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t('dashboard.sites.pricing.scheduledNotice', { date: new Date(scheduledBook.effectiveFrom).toLocaleDateString('de-DE') })}
          </span>
          <button onClick={handleCancelScheduled} disabled={cancelLoading}
            style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, color: '#92400e', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {cancelLoading ? t('dashboard.sites.pricing.cancelling') : t('dashboard.sites.pricing.cancel')}
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {publishedBook ? t('dashboard.sites.pricing.activeSince', { date: new Date(publishedBook.effectiveFrom).toLocaleDateString('de-DE') }) : t('dashboard.sites.pricing.noPublishedRates')}
        </span>
        {canEdit && !editing && !scheduling && (
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {otherSites.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setCopyOpen(o => !o)} style={btnSecondary}>{t('dashboard.sites.pricing.copyFrom')}</button>
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
            <button onClick={() => { setEditing(true); setRates(buildInitialRates(unitTypes, publishedBook)); setSaveError(''); }} style={btnPrimary}>
              {t('dashboard.sites.pricing.editPrices')}
            </button>
          </div>
        )}
      </div>

      {/* Copy error shown outside dropdown */}
      {copyError && !copyOpen && (
        <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{copyError}</p>
      )}

      {/* Rate table */}
      {unitTypes.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.sites.pricing.emptyTitle')}</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.sites.pricing.emptyBody')}</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {[t('dashboard.sites.pricing.columnUnitType'), t('dashboard.sites.pricing.columnMonthlyRate'), t('dashboard.sites.pricing.columnBillingCycle')].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unitTypes.map((ut, i) => {
                const rate = displayRates[ut.id];
                return (
                  <tr key={ut.id} style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {ut.name} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>({ut.sizeSqm}m²)</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editing ? (
                        <input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={rate?.amountEur ?? ''}
                          onChange={e => setRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], amountEur: e.target.value } }))}
                          style={{ ...inp, width: '120px' }}
                        />
                      ) : (
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {rate?.amountEur ? `€${parseFloat(rate.amountEur).toFixed(2)}` : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editing ? (
                        <select
                          value={rate?.billingCycle ?? 'monthly'}
                          onChange={e => setRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], billingCycle: e.target.value } }))}
                          style={{ ...inp, width: '140px' }}
                        >
                          <option value="monthly">{t('dashboard.sites.pricing.billingMonthly')}</option>
                          <option value="fixed_term">{t('dashboard.sites.pricing.billingFixedTerm')}</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
                          {rate?.billingCycle === 'monthly' ? t('dashboard.sites.pricing.billingMonthly') : rate?.billingCycle === 'fixed_term' ? t('dashboard.sites.pricing.billingFixedTerm') : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {editing && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={handleSaveNow} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? t('dashboard.sites.pricing.saving') : t('dashboard.sites.pricing.savePublishNow')}
              </button>
              <button onClick={() => setEditing(false)} style={btnGhost}>{t('dashboard.sites.pricing.cancel')}</button>
              {saveError && <span style={{ fontSize: '12px', color: '#dc2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{saveError}</span>}
            </div>
          )}
        </div>
      )}

      {/* Schedule rate change */}
      {canEdit && !editing && !scheduledBook && unitTypes.length > 0 && (
        <div>
          {scheduling ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{t('dashboard.sites.pricing.effectiveDate')}</span>
                <input type="date" value={schedDate} min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  onChange={e => setSchedDate(e.target.value)} style={{ ...inp, width: '160px' }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {unitTypes.map((ut, i) => {
                    const r = schedRates[ut.id];
                    return (
                      <tr key={ut.id} style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.name}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <input type="number" step="0.01" min="0" placeholder="0.00" value={r?.amountEur ?? ''}
                            onChange={e => setSchedRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], amountEur: e.target.value } }))}
                            style={{ ...inp, width: '120px' }} />
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <select value={r?.billingCycle ?? 'monthly'}
                            onChange={e => setSchedRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], billingCycle: e.target.value } }))}
                            style={{ ...inp, width: '140px' }}>
                            <option value="monthly">{t('dashboard.sites.pricing.billingMonthly')}</option>
                            <option value="fixed_term">{t('dashboard.sites.pricing.billingFixedTerm')}</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={handleSchedule} disabled={saving || !schedDate} style={{ ...btnPrimary, opacity: (saving || !schedDate) ? 0.6 : 1, cursor: (saving || !schedDate) ? 'not-allowed' : 'pointer' }}>
                  {saving ? t('dashboard.sites.pricing.scheduling') : t('dashboard.sites.pricing.scheduleRateChange')}
                </button>
                <button onClick={() => setScheduling(false)} style={btnGhost}>{t('dashboard.sites.pricing.cancel')}</button>
                {saveError && <span style={{ fontSize: '12px', color: '#dc2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{saveError}</span>}
              </div>
            </div>
          ) : (
            <button onClick={() => { setScheduling(true); setSchedRates(buildInitialRates(unitTypes, publishedBook)); setSaveError(''); }}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>
              {t('dashboard.sites.pricing.scheduleRateChangeLink')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
