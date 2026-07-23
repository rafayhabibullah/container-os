import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import ApiKeyActions from './ApiKeyActions';

interface ApiKey { id: string; status: string; expiresAt: string; lastUsedAt: string | null; }
interface ApiClient { id: string; name: string; scopes: string[]; keys: ApiKey[]; }

export default async function ApiKeysPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');
  const clients = await serverFetch<ApiClient[]>(`/v1/organisations/${user.organisationId}/api-keys`).catch(() => []);
  const t = getT();

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-slate-900">{t('dashboard.settings.apiKeys.title')}</h2>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-extrabold text-slate-900">{t('dashboard.settings.apiKeys.createClient')}</h3>
        <ApiKeyActions type="create" />
      </section>

      <div className="flex flex-col gap-4">
        {clients.map((client) => (
          <section key={client.id} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900">{client.name}</h3>
            <p className="mt-1 text-xs text-slate-500">{t('dashboard.settings.apiKeys.scopes', { scopes: client.scopes.join(', ') || t('dashboard.settings.apiKeys.scopesNone') })}</p>
            <div className="mt-4 flex flex-col gap-2">
              {client.keys.map((key) => (
                <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-600">
                    {t('dashboard.settings.apiKeys.expires', { date: new Date(key.expiresAt).toLocaleDateString('de-DE') })}{' · '}
                    {t('dashboard.settings.apiKeys.lastUsed', { date: key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString('de-DE') : t('dashboard.settings.apiKeys.never') })}
                  </p>
                  <ApiKeyActions type="revoke" apiKeyId={key.id} />
                </div>
              ))}
              {client.keys.length === 0 && <p className="text-xs text-slate-400">{t('dashboard.settings.apiKeys.noActiveKeys')}</p>}
            </div>
          </section>
        ))}
        {clients.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400 shadow-sm">
            {t('dashboard.settings.apiKeys.noClients')}
          </div>
        )}
      </div>
    </div>
  );
}
