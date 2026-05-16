import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface AuditEvent {
  id: string; action: string; subjectType: string; subjectId: string;
  actorId: string | null; siteId: string | null; createdAt: string;
}

export default async function AuditPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await requireAuth();
  const page = searchParams.page ?? '1';
  const events = await serverFetch<AuditEvent[]>(
    `/v1/organisations/${user.organisationId}/audit?page=${page}`,
  ).catch(() => []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row { background: #ffffff; } .tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Audit Log</h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Table */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Action</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Subject</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Actor</th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>
                        {e.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
                      {e.subjectType}:{e.subjectId.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                      {e.actorId?.slice(0, 8) ?? 'system'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
                      No audit events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>{events.length} events</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {parseInt(page) > 1 && (
                  <Link
                    href={`?page=${parseInt(page) - 1}`}
                    style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  >
                    ← Prev
                  </Link>
                )}
                {events.length === 50 && (
                  <Link
                    href={`?page=${parseInt(page) + 1}`}
                    style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
