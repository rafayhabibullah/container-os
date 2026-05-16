import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';

interface DocumentRow {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  locale: string | null;
  createdAt: string;
}

const KIND_PILL: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  contract:    { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  invoice:     { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  id_document: { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

const defaultPill = { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' };

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

export default async function DocumentsPage() {
  const user = await requireAuth();
  const documents = await serverFetch<DocumentRow[]>(
    `/v1/organisations/${user.organisationId}/documents`,
  ).catch(() => [] as DocumentRow[]);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Documents
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>

          {/* Search bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search…" readOnly style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }} />
          </div>

          {documents.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '64px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>No documents stored yet</p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Documents will appear here once created.</p>
            </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {(['Kind', 'Subject', 'Locale', 'Date'] as const).map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const pill = KIND_PILL[doc.kind] ?? defaultPill;
                    return (
                      <tr key={doc.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600, background: pill.bg, color: pill.color, border: `1px solid ${pill.border}` }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
                            {doc.kind}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', textTransform: 'capitalize' }}>{doc.subjectType}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{doc.locale ?? '—'}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>
                          {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
