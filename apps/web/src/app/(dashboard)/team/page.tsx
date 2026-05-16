import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TeamActions from './TeamActions';

interface Member {
  id: string;
  role: 'owner' | 'operator' | 'tenant';
  user: { id: string; name: string | null; email: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

const pillBase: React.CSSProperties = {
  borderRadius: '20px',
  padding: '3px 10px',
  fontSize: '12px',
  fontWeight: 600,
  display: 'inline-block',
};

const ROLE_PILL: Record<string, React.CSSProperties> = {
  owner: { ...pillBase, background: '#0f172a', color: '#ffffff', border: '1px solid #0f172a' },
  operator: { ...pillBase, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  tenant: { ...pillBase, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' },
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

export default async function TeamPage() {
  const user = await requireAuth();
  const orgId = user.organisationId;

  const members = await serverFetch<Member[]>(`/v1/organisations/${orgId}/members`);
  const invitations = user.role === 'owner'
    ? await serverFetch<Invitation[]>(`/v1/organisations/${orgId}/invitations`).catch(() => [])
    : [];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Team</h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Members table */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Members</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  {user.role === 'owner' && <th style={{ ...thStyle, textAlign: 'right' }}></th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{m.user.name ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>{m.user.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={ROLE_PILL[m.role] ?? { ...pillBase, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                        {m.role}
                      </span>
                    </td>
                    {user.role === 'owner' && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {m.user.id !== user.sub && (
                          <TeamActions type="remove-member" id={m.id} label="Remove" />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invite form (owner only) */}
          {user.role === 'owner' && (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Invite a team member</h2>
              <TeamActions type="invite-form" id="" label="" />
            </div>
          )}

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Pending invitations</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Expires</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a' }}>{inv.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={ROLE_PILL[inv.role] ?? { ...pillBase, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                          {inv.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                        {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <TeamActions type="revoke-invitation" id={inv.id} label="Revoke" />
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
