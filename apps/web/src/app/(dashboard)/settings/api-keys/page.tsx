import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import ApiKeyActions from './ApiKeyActions';
import Link from 'next/link';

interface ApiKey { id: string; status: string; expiresAt: string; lastUsedAt: string | null; }
interface ApiClient { id: string; name: string; scopes: string[]; keys: ApiKey[]; }

export default async function ApiKeysPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');

  const clients = await serverFetch<ApiClient[]>(`/v1/organisations/${user.organisationId}/api-keys`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Settings</Link>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
        </div>
        <div className="bg-white rounded-2xl shadow mb-6 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Create API client</h2>
          <ApiKeyActions type="create" />
        </div>
        <div className="space-y-4">
          {clients.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl shadow p-6">
              <div className="mb-3">
                <h3 className="font-semibold text-slate-800">{client.name}</h3>
                <p className="text-slate-400 text-xs mt-0.5">Scopes: {client.scopes.join(', ') || 'none'}</p>
              </div>
              <div className="space-y-2">
                {client.keys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                    <p className="text-slate-500 text-xs">
                      Expires {new Date(key.expiresAt).toLocaleDateString()} ·{' '}
                      Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'never'}
                    </p>
                    <ApiKeyActions type="revoke" apiKeyId={key.id} />
                  </div>
                ))}
                {client.keys.length === 0 && <p className="text-slate-400 text-xs">No active keys.</p>}
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <p className="text-slate-500">No API clients yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
