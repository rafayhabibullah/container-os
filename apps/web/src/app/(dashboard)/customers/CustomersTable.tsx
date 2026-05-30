'use client';

import { useState, useMemo } from 'react';
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

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: '11px',
  fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em',
  textTransform: 'uppercase', whiteSpace: 'nowrap',
};

export default function CustomersTable({ customers }: { customers: Customer[] }) {
  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      displayName(c).toLowerCase().includes(q) ||
      (c.contacts[0]?.email ?? '').toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q),
    );
  }, [customers, query]);

  return (
    <>
      {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />}
      <style>{`
        .cust-row:hover { background: #f8fafc !important; }
        .cust-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      {/* Search */}
      <div
        className="cust-search-box"
        style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '16px', transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
          <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customers…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: '14px', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
            {customers.length === 0 ? 'No customers yet' : 'No results found'}
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            {customers.length === 0 ? 'Customers will appear here once they have agreements.' : 'Try adjusting your search.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Since</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="cust-row"
                  onClick={() => setSelected(c)}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {displayName(c)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    {c.contacts[0]?.email ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', borderRadius: '20px',
                      padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                      background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0',
                    }}>
                      {c.type === 'organisation' ? 'Organisation' : 'Person'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                    {new Date(c.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
