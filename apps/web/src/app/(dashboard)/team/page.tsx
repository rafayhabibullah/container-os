import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TeamActions from './TeamActions';
import Link from 'next/link';

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

export default async function TeamPage() {
  const user = await requireAuth();
  const orgId = user.organisationId;

  const members = await serverFetch<Member[]>(`/v1/organisations/${orgId}/members`);
  const invitations = user.role === 'owner'
    ? await serverFetch<Invitation[]>(`/v1/organisations/${orgId}/invitations`).catch(() => [])
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl shadow mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Members</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Role</th>
                {user.role === 'owner' && <th className="px-6 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{m.user.name ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{m.user.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {m.role}
                    </span>
                  </td>
                  {user.role === 'owner' && (
                    <td className="px-6 py-4 text-right">
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
          <div className="bg-white rounded-2xl shadow mb-6 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Invite a team member</h2>
            <TeamActions type="invite-form" id="" label="" />
          </div>
        )}

        {/* Pending invitations (owner only) */}
        {user.role === 'owner' && invitations.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Pending invitations</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Role</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {inv.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
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
  );
}
