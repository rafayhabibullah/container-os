'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import CustomerDrawer from './CustomerDrawer';

interface Customer {
  id: string;
  type: 'private' | 'business' | 'person' | 'organisation';
  personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
  contacts: { email: string }[];
  createdAt: string;
  activeAgreement?: {
    siteName: string;
    unitCode: string;
    monthlyRentMinor: number | null;
    paidThroughDate: string | null;
  } | null;
}

interface Site {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitCode: string;
  status: string;
  unitTypeId: string;
}

function displayName(c: Customer): string {
  const d = c.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || c.id;
}

const FILTERS = [
  { key: 'all',          labelKey: 'dashboard.customers.filters.all'          },
  { key: 'private',      labelKey: 'dashboard.customers.filters.person'       },
  { key: 'business',     labelKey: 'dashboard.customers.filters.organisation' },
] as const;

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: '11px',
  fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em',
  textTransform: 'uppercase', whiteSpace: 'nowrap',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function normalType(type: Customer['type']) {
  return type === 'organisation' ? 'business' : type === 'person' ? 'private' : type;
}

function euro(minor: number | null | undefined) {
  if (minor == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 10px',
  fontSize: '13px',
  color: '#0f172a',
  outline: 'none',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '11px',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#64748b',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayThisMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function ImportTenantModal({ sites, onClose, onCreated }: { sites: Site[]; onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const [tenantType, setTenantType] = useState<'private' | 'business'>('private');
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState('');
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) return;
    setLoadingUnits(true);
    fetch(`/api/sites/${siteId}/units`)
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data: Unit[]) => {
        const selectable = data.filter((unit) => ['available', 'reserved', 'occupied'].includes(unit.status));
        setUnits(selectable);
        setUnitId((current) => selectable.some((unit) => unit.id === current) ? current : selectable[0]?.id ?? '');
      })
      .catch(() => {
        setUnits([]);
        setUnitId('');
      })
      .finally(() => setLoadingUnits(false));
  }, [siteId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const monthlyRent = Number(form.get('monthlyRent') || 0);
    const payload = {
      type: tenantType,
      firstName: form.get('firstName') || undefined,
      lastName: form.get('lastName') || undefined,
      companyName: form.get('companyName') || undefined,
      email: form.get('email'),
      phone: form.get('phone') || undefined,
      siteId,
      unitId,
      moveInDate: form.get('moveInDate'),
      paidThroughDate: form.get('paidThroughDate'),
      monthlyRentMinor: Math.round(monthlyRent * 100),
      paymentMethod: form.get('paymentMethod'),
      notes: form.get('notes') || undefined,
    };
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(body?.error?.message ?? body?.message ?? t('dashboard.customers.import.failed'));
      setSaving(false);
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <form onSubmit={submit} style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 24px 80px rgba(15,23,42,0.22)' }}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{t('dashboard.customers.import.title')}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>{t('dashboard.customers.import.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer' }}>x</button>
        </div>

        <div style={{ padding: '22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.type')}</label>
            <select value={tenantType} onChange={(event) => setTenantType(event.target.value as 'private' | 'business')} style={fieldStyle}>
              <option value="private">{t('dashboard.customers.type.person')}</option>
              <option value="business">{t('dashboard.customers.type.organisation')}</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.email')}</label>
            <input required name="email" type="email" placeholder="tenant@example.de" style={fieldStyle} />
          </div>

          {tenantType === 'business' ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{t('dashboard.customers.import.companyName')}</label>
              <input required name="companyName" placeholder="Muster Logistik GmbH" style={fieldStyle} />
            </div>
          ) : (
            <>
              <div>
                <label style={labelStyle}>{t('dashboard.customers.import.firstName')}</label>
                <input required name="firstName" placeholder="Max" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('dashboard.customers.import.lastName')}</label>
                <input required name="lastName" placeholder="Mustermann" style={fieldStyle} />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.phone')}</label>
            <input name="phone" placeholder="+49 30 12345678" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.site')}</label>
            <select required value={siteId} onChange={(event) => setSiteId(event.target.value)} style={fieldStyle}>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.unit')}</label>
            <select required value={unitId} onChange={(event) => setUnitId(event.target.value)} style={fieldStyle} disabled={loadingUnits || units.length === 0}>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitCode} ({unit.status})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.monthlyRent')}</label>
            <input required name="monthlyRent" type="number" min="0" step="0.01" defaultValue="149.00" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.moveInDate')}</label>
            <input required name="moveInDate" type="date" defaultValue={firstDayThisMonth()} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.paidThroughDate')}</label>
            <input required name="paidThroughDate" type="date" defaultValue={todayIso()} style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.paymentMethod')}</label>
            <select name="paymentMethod" defaultValue="bank_transfer" style={fieldStyle}>
              <option value="bank_transfer">{t('dashboard.customers.mandates.schemeOptions.bank_transfer')}</option>
              <option value="manual_invoice">{t('dashboard.customers.mandates.schemeOptions.manual_invoice')}</option>
              <option value="cash">{t('dashboard.customers.mandates.schemeOptions.cash')}</option>
              <option value="sepa_core">{t('dashboard.customers.mandates.schemeOptions.sepa_core')}</option>
              <option value="card">{t('dashboard.customers.mandates.schemeOptions.card')}</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('dashboard.customers.import.notes')}</label>
            <input name="notes" placeholder={t('dashboard.customers.import.notesPlaceholder')} style={fieldStyle} />
          </div>

          {error && <div style={{ gridColumn: '1 / -1', padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>{error}</div>}
        </div>

        <div style={{ padding: '16px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#475569', borderRadius: '8px', padding: '9px 13px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{t('dashboard.customers.import.cancel')}</button>
          <button type="submit" disabled={saving || !siteId || !unitId} style={{ border: '1px solid #2563eb', background: '#2563eb', color: '#fff', borderRadius: '8px', padding: '9px 13px', fontSize: '13px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? t('dashboard.customers.import.saving') : t('dashboard.customers.import.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CustomersTable({ customers, sites }: { customers: Customer[]; sites: Site[] }) {
  const t = useT();
  const router = useRouter();
  const [query,      setQuery]      = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selected,   setSelected]   = useState<Customer | null>(null);
  const [showImport, setShowImport] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchQ = !q ||
        displayName(c).toLowerCase().includes(q) ||
        (c.contacts[0]?.email ?? '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || normalType(c.type) === typeFilter;
      return matchQ && matchT;
    });
  }, [customers, query, typeFilter]);

  return (
    <>
      {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />}
      {showImport && <ImportTenantModal sites={sites} onClose={() => setShowImport(false)} onCreated={() => router.refresh()} />}
      <style>{`
        @keyframes cust-row-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .cust-row { animation: cust-row-in 0.25s ease both; }
        .cust-row:hover { background: #f8fafc !important; }
        .cust-filter-btn { transition: all 0.12s ease; }
        .cust-filter-btn:hover { color: #0f172a !important; }
        .cust-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
        .cust-primary-btn:hover { background: #1d4ed8 !important; }
      `}</style>

      <div style={{
        background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
            {FILTERS.map((f) => {
              const active = typeFilter === f.key;
              const count  = f.key === 'all' ? customers.length : customers.filter((c) => normalType(c.type) === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className="cust-filter-btn"
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none',
                    background: active ? '#f1f5f9' : 'transparent',
                    color: active ? '#0f172a' : '#94a3b8',
                    fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: active ? 600 : 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  {t(f.labelKey)}
                  <span style={{
                    background: active ? '#e2e8f0' : '#f8fafc',
                    color: active ? '#475569' : '#cbd5e1',
                    borderRadius: '4px', padding: '1px 6px',
                    fontSize: '11px', fontWeight: 600,
                    minWidth: '20px', textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            className="cust-primary-btn"
            onClick={() => setShowImport(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#2563eb', color: '#fff', border: '1px solid #2563eb',
              borderRadius: '8px', padding: '8px 12px', fontSize: '13px',
              fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            {t('dashboard.customers.import.open')}
          </button>

          <div
            className="cust-search-box"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '7px 12px',
              minWidth: '220px', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('dashboard.customers.searchPlaceholder')}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#0f172a', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {t(customers.length === 0 ? 'dashboard.customers.empty.noCustomers' : 'dashboard.customers.empty.noResults')}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {t(customers.length === 0 ? 'dashboard.customers.emptyHint.noCustomers' : 'dashboard.customers.emptyHint.noResults')}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={thStyle}>{t('dashboard.customers.table.name')}</th>
                <th style={thStyle}>{t('dashboard.customers.table.email')}</th>
                <th style={thStyle}>{t('dashboard.customers.table.unit')}</th>
                <th style={thStyle}>{t('dashboard.customers.table.paidThrough')}</th>
                <th style={thStyle}>{t('dashboard.customers.table.rent')}</th>
                <th style={thStyle}>{t('dashboard.customers.table.type')}</th>
                <th style={thStyle}>{t('dashboard.customers.table.since')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="cust-row"
                  onClick={() => setSelected(c)}
                  style={{
                    animationDelay: `${i * 30}ms`,
                    borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {displayName(c)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {c.contacts[0]?.email ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {c.activeAgreement ? (
                      <span>
                        <strong style={{ color: '#0f172a' }}>{c.activeAgreement.unitCode}</strong>
                        <span style={{ color: '#94a3b8' }}> · {c.activeAgreement.siteName}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {c.activeAgreement?.paidThroughDate ? new Date(c.activeAgreement.paidThroughDate).toLocaleDateString('de-DE') : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {euro(c.activeAgreement?.monthlyRentMinor)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                      background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
                      {normalType(c.type) === 'business' ? t('dashboard.customers.type.organisation') : t('dashboard.customers.type.person')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {new Date(c.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
