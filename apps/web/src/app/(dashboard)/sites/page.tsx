import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface SiteAddress {
  city: string;
}

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: SiteAddress;
}

export default async function SitesPage() {
  const user = await requireAuth();
  const sites = await serverFetch<Site[]>(
    `/v1/organisations/${user.organisationId}/sites`,
  ).catch(() => [] as Site[]);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .site-row { background: #ffffff; }
        .site-row:hover { background: #f8fafc; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#f1f5f9',
          padding: '36px 40px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '28px',
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
                Sites
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  margin: '4px 0 0',
                }}
              >
                {sites.length} location{sites.length !== 1 ? 's' : ''}
              </p>
            </div>
            {user.role === 'owner' && (
              <Link
                href="/sites/new"
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                + Add site
              </Link>
            )}
          </div>

          {/* Search toolbar */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                style={{ color: '#94a3b8', flexShrink: 0 }}
              >
                <path
                  d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search sites…"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#94a3b8',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  width: '100%',
                }}
                readOnly
              />
            </div>
          </div>

          {/* Table / empty state */}
          {sites.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                overflow: 'hidden',
                padding: '40px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No sites yet</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 12px' }}>Sites will appear here once added.</p>
              {user.role === 'owner' && (
                <Link
                  href="/sites/new"
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Add your first site →
                </Link>
              )}
            </div>
          ) : (
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '10px 16px',
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '10px 16px',
                      }}
                    >
                      City
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '10px 16px',
                      }}
                    >
                      Slug
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#94a3b8',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '10px 16px',
                      }}
                    >
                      Status
                    </th>
                    <th style={{ padding: '10px 16px' }} />
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr
                      key={site.id}
                      className="site-row"
                      style={{ borderBottom: '1px solid #f8fafc' }}
                    >
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        {site.name}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          color: '#475569',
                        }}
                      >
                        {site.address?.city}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: '12px',
                          color: '#94a3b8',
                          fontFamily: 'monospace',
                        }}
                      >
                        {site.slug}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {site.status === 'active' ? (
                          <span
                            style={{
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              borderRadius: '20px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#16a34a',
                                display: 'inline-block',
                                flexShrink: 0,
                              }}
                            />
                            active
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#f8fafc',
                              color: '#94a3b8',
                              border: '1px solid #e2e8f0',
                              borderRadius: '20px',
                              padding: '3px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#cbd5e1',
                                display: 'inline-block',
                                flexShrink: 0,
                              }}
                            />
                            inactive
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <Link
                          href={`/sites/${site.id}`}
                          style={{
                            color: '#64748b',
                            fontSize: '13px',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Manage →
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
