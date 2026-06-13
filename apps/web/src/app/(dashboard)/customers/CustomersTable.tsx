'use client';

import { useState, useMemo } from 'react';
import { useT } from '@/lib/i18n';
import CustomerDrawer from './CustomerDrawer';

interface Customer {
  id: string;
  type: 'person' | 'organisation';
  personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
  contacts: { email: string }[];
  createdAt: string;
}

function displayName(c: Customer): string {
  const d = c.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || c.id;
}

const FILTERS = [
  { key: 'all',          labelKey: 'dashboard.customers.filters.all'          },
  { key: 'person',       labelKey: 'dashboard.customers.filters.person'       },
  { key: 'organisation', labelKey: 'dashboard.customers.filters.organisation' },
] as const;

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: '11px',
  fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em',
  textTransform: 'uppercase', whiteSpace: 'nowrap',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function CustomersTable({ customers }: { customers: Customer[] }) {
  const t = useT();
  const [query,      setQuery]      = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selected,   setSelected]   = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchQ = !q ||
        displayName(c).toLowerCase().includes(q) ||
        (c.contacts[0]?.email ?? '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || c.type === typeFilter;
      return matchQ && matchT;
    });
  }, [customers, query, typeFilter]);

  return (
    <>
      {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />}
      <style>{`
        @keyframes cust-row-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .cust-row { animation: cust-row-in 0.25s ease both; }
        .cust-row:hover { background: #f8fafc !important; }
        .cust-filter-btn { transition: all 0.12s ease; }
        .cust-filter-btn:hover { color: #0f172a !important; }
        .cust-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
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
              const count  = f.key === 'all' ? customers.length : customers.filter((c) => c.type === f.key).length;
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
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                      background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8', flexShrink: 0 }} />
                      {c.type === 'organisation' ? t('dashboard.customers.type.organisation') : t('dashboard.customers.type.person')}
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
