import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Site {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const [sites, members] = await Promise.all([
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(
      () => [] as Site[],
    ),
    serverFetch<{ id: string }[]>(
      `/v1/organisations/${user.organisationId}/members`,
    ).catch(() => []),
  ]);

  const stats = [
    { label: 'TOTAL SITES', value: sites.length, href: '/sites' },
    { label: 'TEAM MEMBERS', value: members.length, href: '/team' },
  ];

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
        .dash-site-row:hover { background: #f8fafc; }
        .dash-manage-link:hover { color: #0f172a; }
        .dash-viewall-link:hover { color: #0f172a; }
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

          {/* Avatar */}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
                border: '1px solid #e2e8f0',
                boxShadow:
                  '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                padding: '20px',
                textDecoration: 'none',
                transition: 'box-shadow 0.15s ease',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#94a3b8',
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
                  color: '#0f172a',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </p>
            </Link>
          ))}
        </div>

        {/* Recent sites preview */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow:
              '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Sites
            </span>
            <Link
              href="/sites"
              className="dash-viewall-link"
              style={{
                fontSize: '13px',
                color: '#64748b',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
            >
              View all →
            </Link>
          </div>

          {sites.length === 0 ? (
            <p
              style={{
                padding: '32px 20px',
                fontSize: '14px',
                color: '#94a3b8',
                textAlign: 'center',
                margin: 0,
              }}
            >
              No sites yet.{' '}
              <Link
                href="/sites/new"
                style={{ color: '#64748b', textDecoration: 'underline' }}
              >
                Add your first site →
              </Link>
            </p>
          ) : (
            <div>
              {sites.slice(0, 5).map((site) => (
                <div
                  key={site.id}
                  className="dash-site-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderBottom: '1px solid #f8fafc',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {site.name}
                  </span>
                  <Link
                    href={`/sites/${site.id}`}
                    className="dash-manage-link"
                    style={{
                      fontSize: '13px',
                      color: '#64748b',
                      textDecoration: 'none',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
