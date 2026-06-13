import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import ApiKeyActions from './ApiKeyActions';
import Link from 'next/link';
import { getT } from '@/lib/get-locale';

interface ApiKey { id: string; status: string; expiresAt: string; lastUsedAt: string | null; }
interface ApiClient { id: string; name: string; scopes: string[]; keys: ApiKey[]; }

export default async function ApiKeysPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');

  const clients = await serverFetch<ApiClient[]>(`/v1/organisations/${user.organisationId}/api-keys`).catch(() => []);
  const t = await getT();

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <Link
              href="/settings"
              style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}
            >
              {t('dashboard.settings.apiKeys.backToSettings')}
            </Link>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              {t('dashboard.settings.apiKeys.title')}
            </h1>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>{t('dashboard.settings.apiKeys.createClient')}</h2>
            <ApiKeyActions type="create" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {clients.map((client) => (
              <div key={client.id} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{client.name}</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('dashboard.settings.apiKeys.scopes', { scopes: client.scopes.join(', ') || t('dashboard.settings.apiKeys.scopesNone') })}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {client.keys.map((key) => (
                    <div key={key.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '8px', padding: '10px 16px' }}>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                        {t('dashboard.settings.apiKeys.expires', { date: new Date(key.expiresAt).toLocaleDateString('de-DE') })}{' · '}
                        {t('dashboard.settings.apiKeys.lastUsed', { date: key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString('de-DE') : t('dashboard.settings.apiKeys.never') })}
                      </p>
                      <ApiKeyActions type="revoke" apiKeyId={key.id} />
                    </div>
                  ))}
                  {client.keys.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{t('dashboard.settings.apiKeys.noActiveKeys')}</p>
                  )}
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>{t('dashboard.settings.apiKeys.noClients')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
