import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Customer {
  id: string;
  type: 'person' | 'organisation';
  personOrOrgData: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    name?: string;
    email?: string;
  };
  createdAt: string;
}

function displayName(c: Customer): string {
  const d = c.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || c.id;
}

const typePillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  borderRadius: '20px',
  padding: '3px 10px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#f8fafc',
  color: '#475569',
  border: '1px solid #e2e8f0',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

export default async function CustomersPage() {
  const user = await requireAuth();
  const customers = await serverFetch<Customer[]>(
    `/v1/organisations/${user.organisationId}/customers`,
  ).catch(() => [] as Customer[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Customers
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '28px' }}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>

          {/* Search bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search…" readOnly style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }} />
          </div>

          {customers.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No customers yet</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Customers will appear here once added.</p>
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
                    <th style={{ ...thStyle, textAlign: 'right' }} />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        {displayName(customer)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {customer.personOrOrgData.email ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={typePillStyle}>
                          {customer.type === 'organisation' ? 'Organisation' : 'Person'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        {new Date(customer.createdAt).toLocaleDateString('de-DE')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Link href={`/customers/${customer.id}`} style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
