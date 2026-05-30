import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Site {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface Member {
  id: string;
  role: 'owner' | 'operator' | 'tenant';
  user: { id: string; name: string | null; email: string };
}

interface Booking {
  id: string;
  status: string;
  source: string;
  startDate: string;
  expiresAt: string;
  createdAt: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  unitId: string;
  siteId: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  siteId: string;
}

interface Incident {
  id: string;
  type: string;
  status: string;
  severity: string;
  siteId: string;
  createdAt: string;
}

interface InvoiceRow {
  id: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  agreement: {
    customer: {
      id: string;
      personOrOrgData: {
        firstName?: string;
        lastName?: string;
        companyName?: string;
        name?: string;
      };
    };
  };
}

const BOOKING_STATUS: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  pending:   { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  active:    { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  expired:   { dot: '#94a3b8', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  cancelled: { dot: '#ef4444', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

const PRIORITY_PILL: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  high:     { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  medium:   { color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  low:      { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

const ROLE_PILL: Record<string, { color: string; bg: string; border: string }> = {
  owner:    { color: '#ffffff', bg: '#0f172a', border: '#0f172a' },
  operator: { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  tenant:   { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

const SEVERITY_PILL: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  high:     { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  medium:   { color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  low:      { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
};

function tenantName(customer: InvoiceRow['agreement']['customer']) {
  const d = customer.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  if (d.firstName || d.lastName) return `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim();
  return 'Unknown';
}

function fmtCurrency(minor: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(minor / 100);
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const [sites, members, bookings, tasks, incidents, invoices] = await Promise.all([
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => [] as Site[]),
    serverFetch<Member[]>(`/v1/organisations/${user.organisationId}/members`).catch(() => [] as Member[]),
    serverFetch<Booking[]>(`/v1/organisations/${user.organisationId}/reservations`).catch(() => [] as Booking[]),
    serverFetch<Task[]>(`/v1/organisations/${user.organisationId}/tasks`).catch(() => [] as Task[]),
    serverFetch<Incident[]>(`/v1/organisations/${user.organisationId}/incidents`).catch(() => [] as Incident[]),
    serverFetch<InvoiceRow[]>(`/v1/organisations/${user.organisationId}/invoices`).catch(() => [] as InvoiceRow[]),
  ]);

  const pendingReservations = bookings.filter((b) => b.status === 'pending').length;
  const openTasks = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const openIncidents = incidents.filter((i) => i.status === 'open');
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');

  const stats = [
    { label: 'TOTAL SITES', value: sites.length, href: '/sites' },
    { label: 'TEAM MEMBERS', value: members.length, href: '/team' },
    { label: 'PENDING RESERVATIONS', value: pendingReservations, href: '/reservations', accent: pendingReservations > 0 },
    { label: 'OPEN TASKS', value: openTasks.length, href: '/tasks', accent: openTasks.length > 0 },
    { label: 'OPEN INCIDENTS', value: openIncidents.length, href: '/incidents', accent: openIncidents.length > 0 },
    { label: 'OVERDUE INVOICES', value: overdueInvoices.length, href: '/invoices', accent: overdueInvoices.length > 0 },
  ];

  const panelStyle = {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    overflow: 'hidden',
  };

  const panelHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  };

  const panelTitleStyle = { fontSize: '14px', fontWeight: 700, color: '#0f172a' };

  const viewAllStyle = {
    fontSize: '13px',
    color: '#64748b',
    textDecoration: 'none',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '1px solid #f8fafc',
  };

  const emptyStyle = {
    padding: '32px 20px',
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center' as const,
    margin: 0,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        padding: '36px 40px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <style>{`
        .dash-stat-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.10); }
        .dash-row:hover { background: #f8fafc; }
        .dash-link:hover { color: #0f172a; }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Page header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Dashboard
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#94a3b8',
                marginTop: '4px',
                marginBottom: 0,
              }}
            >
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {user.role?.[0] ?? 'U'}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="dash-stat-card"
              style={{
                display: 'block',
                background: '#ffffff',
                borderRadius: '12px',
                border: stat.accent ? '1px solid #fde68a' : '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                padding: '20px',
                textDecoration: 'none',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: stat.accent ? '#92400e' : '#94a3b8',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: '0 0 10px 0',
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: stat.accent ? '#92400e' : '#0f172a',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </p>
            </Link>
          ))}
        </div>

        {/* 2-column grid for panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

          {/* Recent Reservations */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span style={panelTitleStyle}>Recent Reservations</span>
              <Link href="/reservations" className="dash-link" style={viewAllStyle}>View all →</Link>
            </div>
            {bookings.length === 0 ? (
              <p style={emptyStyle}>No reservations yet.</p>
            ) : (
              <div>
                {bookings.slice(0, 5).map((b) => {
                  const s = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.expired;
                  return (
                    <Link key={b.id} href="/reservations" className="dash-row" style={{ ...rowStyle, textDecoration: 'none', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {b.customerName ?? b.customerEmail ?? `#${b.id.slice(0, 8)}`}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          Starts {new Date(b.startDate).toLocaleDateString('de-DE')} · {b.source}
                        </span>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
                        {b.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overdue Invoices */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span style={panelTitleStyle}>Overdue Invoices</span>
              <Link href="/invoices" className="dash-link" style={viewAllStyle}>View all →</Link>
            </div>
            {overdueInvoices.length === 0 ? (
              <p style={emptyStyle}>No overdue invoices.</p>
            ) : (
              <div>
                {overdueInvoices.slice(0, 5).map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="dash-row" style={{ ...rowStyle, textDecoration: 'none', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {tenantName(inv.agreement.customer)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Due {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b' }}>
                      {fmtCurrency(inv.totalMinor, inv.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Open Tasks */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span style={panelTitleStyle}>Open Tasks</span>
              <Link href="/tasks" className="dash-link" style={viewAllStyle}>View all →</Link>
            </div>
            {openTasks.length === 0 ? (
              <p style={emptyStyle}>No open tasks.</p>
            ) : (
              <div>
                {openTasks.slice(0, 5).map((t) => {
                  const p = PRIORITY_PILL[t.priority] ?? PRIORITY_PILL.low;
                  return (
                    <Link key={t.id} href="/tasks" className="dash-row" style={{ ...rowStyle, textDecoration: 'none', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </span>
                        {t.dueAt && (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Due {new Date(t.dueAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: p.bg, color: p.color, border: `1px solid ${p.border}`,
                        borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                        marginLeft: '12px', flexShrink: 0, textTransform: 'capitalize',
                      }}>
                        {t.priority}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Open Incidents */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <span style={panelTitleStyle}>Open Incidents</span>
              <Link href="/incidents" className="dash-link" style={viewAllStyle}>View all →</Link>
            </div>
            {openIncidents.length === 0 ? (
              <p style={emptyStyle}>No open incidents.</p>
            ) : (
              <div>
                {openIncidents.slice(0, 5).map((inc) => {
                  const s = SEVERITY_PILL[inc.severity] ?? SEVERITY_PILL.low;
                  return (
                    <Link key={inc.id} href="/incidents" className="dash-row" style={{ ...rowStyle, textDecoration: 'none', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                          {inc.type.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {new Date(inc.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {inc.severity}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Team panel — full width */}
        <div style={{ ...panelStyle, marginBottom: '20px' }}>
          <div style={panelHeaderStyle}>
            <span style={panelTitleStyle}>Team</span>
            <Link href="/team" className="dash-link" style={viewAllStyle}>View all →</Link>
          </div>
          {members.length === 0 ? (
            <p style={emptyStyle}>No members.</p>
          ) : (
            <div>
              {members.map((m) => {
                const r = ROLE_PILL[m.role] ?? ROLE_PILL.tenant;
                return (
                  <div key={m.id} className="dash-row" style={rowStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{m.user.name ?? '—'}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{m.user.email}</span>
                    </div>
                    <span style={{
                      display: 'inline-block',
                      background: r.bg, color: r.color, border: `1px solid ${r.border}`,
                      borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                    }}>
                      {m.role}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sites panel — full width */}
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <span style={panelTitleStyle}>Sites</span>
            <Link href="/sites" className="dash-link" style={viewAllStyle}>View all →</Link>
          </div>

          {sites.length === 0 ? (
            <p style={emptyStyle}>
              No sites yet.{' '}
              <Link href="/sites/new" style={{ color: '#64748b', textDecoration: 'underline' }}>
                Add your first site →
              </Link>
            </p>
          ) : (
            <div>
              {sites.slice(0, 5).map((site) => (
                <Link
                  key={site.id}
                  href={`/sites/${site.id}`}
                  className="dash-row"
                  style={{ ...rowStyle, textDecoration: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {site.name}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    Manage →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
