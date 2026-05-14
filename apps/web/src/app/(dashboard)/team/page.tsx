import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TeamActions from './TeamActions';
import { Badge } from '@sitelager/ui';

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

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const ROLE_VARIANT: Record<string, BadgeVariant> = {
  owner: 'default',
  operator: 'warning',
  tenant: 'outline',
};

export default async function TeamPage() {
  const user = await requireAuth();
  const orgId = user.organisationId;

  const members = await serverFetch<Member[]>(`/v1/organisations/${orgId}/members`);
  const invitations = user.role === 'owner'
    ? await serverFetch<Invitation[]>(`/v1/organisations/${orgId}/invitations`).catch(() => [])
    : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-400 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Members</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 text-left">Name</th>
              <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 text-left">Email</th>
              <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 text-left">Role</th>
              {user.role === 'owner' && <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr
                key={m.id}
                className={`${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-blue-50/30 border-b border-slate-100 last:border-b-0`}
              >
                <td className="px-5 py-3.5 font-medium text-slate-900">{m.user.name ?? '—'}</td>
                <td className="px-5 py-3.5 text-slate-600">{m.user.email}</td>
                <td className="px-5 py-3.5">
                  <Badge variant={ROLE_VARIANT[m.role] ?? 'outline'}>{m.role}</Badge>
                </td>
                {user.role === 'owner' && (
                  <td className="px-5 py-3.5 text-right">
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
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Invite a team member</h2>
          <TeamActions type="invite-form" id="" label="" />
        </div>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Pending invitations</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 text-left">Email</th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 text-left">Role</th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 text-left">Expires</th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={`${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-blue-50/30 border-b border-slate-100 last:border-b-0`}
                >
                  <td className="px-5 py-3.5 text-slate-900">{inv.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={ROLE_VARIANT[inv.role] ?? 'outline'}>{inv.role}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">
                    {new Date(inv.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <TeamActions type="revoke-invitation" id={inv.id} label="Revoke" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
