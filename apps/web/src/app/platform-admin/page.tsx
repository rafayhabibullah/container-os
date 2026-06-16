import { platformFetch } from '@/lib/platform-api';
import PlatformAdminActions from './platform-admin-actions';

export const dynamic = 'force-dynamic';

interface Dashboard {
  organisations: number;
  sites: number;
  units: number;
  activeAgreements: number;
  failedJobs: number;
  subscriptions: { status: string; _count: number }[];
}

interface OrganisationRow {
  id: string;
  legalName: string;
  slug: string;
  status: string;
  plan: string;
  _count?: { sites: number; members: number };
  subscriptions?: { status: string; plan: string }[];
}

interface FailedJob {
  id: string;
  kind: string;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
}

export default async function PlatformAdminPage() {
  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 18 };
  const th: React.CSSProperties = { textAlign: 'left', fontSize: 12, color: '#64748b', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' };
  const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: 13 };

  let dashboard: Dashboard;
  let organisations: OrganisationRow[] = [];
  let failedJobs: FailedJob[] = [];
  let flags: { key: string; enabled: boolean }[] = [];
  try {
    [dashboard, organisations, failedJobs, flags] = await Promise.all([
      platformFetch<Dashboard>('/platform/v1/dashboard'),
      platformFetch<OrganisationRow[]>('/platform/v1/organisations'),
      platformFetch<FailedJob[]>('/platform/v1/jobs/failed'),
      platformFetch<{ key: string; enabled: boolean }[]>('/platform/v1/feature-flags'),
    ]);
  } catch (error) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', ...card }}>
          <h1 style={{ marginTop: 0 }}>Platform Admin</h1>
          <p style={{ color: '#64748b' }}>{error instanceof Error ? error.message : 'Platform admin is not configured.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 20px', fontSize: 28 }}>Platform Admin</h1>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            ['Organisations', dashboard.organisations],
            ['Sites', dashboard.sites],
            ['Units', dashboard.units],
            ['Active agreements', dashboard.activeAgreements],
            ['Failed jobs', dashboard.failedJobs],
          ].map(([label, value]) => (
            <div key={label} style={card}>
              <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </section>

        <section style={card}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>Organisations</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Name</th><th style={th}>Plan</th><th style={th}>Status</th><th style={th}>Sites</th><th style={th}>Members</th><th style={th}>Support Access</th></tr></thead>
            <tbody>
              {organisations.map((org) => (
                <tr key={org.id}>
                  <td style={td}>{org.legalName}<br /><span style={{ color: '#94a3b8' }}>{org.slug}</span></td>
                  <td style={td}>{org.plan}</td>
                  <td style={td}>{org.status}</td>
                  <td style={td}>{org._count?.sites ?? 0}</td>
                  <td style={td}>{org._count?.members ?? 0}</td>
                  <td style={td}><PlatformAdminActions type="support-access" organisationId={org.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginTop: 20 }}>
          <div style={card}>
            <h2 style={{ fontSize: 16, marginTop: 0 }}>Failed Jobs</h2>
            {failedJobs.length === 0 ? <p style={{ color: '#64748b' }}>No failed jobs.</p> : failedJobs.map((job) => (
              <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div><strong>{job.kind}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{job.lastError ?? 'No error'} ({job.attempts} attempts)</span></div>
                <PlatformAdminActions type="retry-job" jobId={job.id} />
              </div>
            ))}
          </div>
          <div style={card}>
            <h2 style={{ fontSize: 16, marginTop: 0 }}>Feature Flags</h2>
            <PlatformAdminActions type="feature-flag" />
            <ul>{flags.map((flag) => <li key={flag.key}>{flag.key}: {flag.enabled ? 'enabled' : 'disabled'}</li>)}</ul>
          </div>
        </section>
      </div>
    </main>
  );
}
