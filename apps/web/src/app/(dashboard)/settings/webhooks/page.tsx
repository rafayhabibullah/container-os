import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import WebhookActions from './WebhookActions';

interface Webhook { id: string; url: string; subscriptions: string[]; status: string; }

export default async function WebhooksPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');
  const webhooks = await serverFetch<Webhook[]>(`/v1/organisations/${user.organisationId}/webhooks`).catch(() => []);
  const t = getT();

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold text-slate-900">{t('dashboard.settings.webhooks.title')}</h2>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-extrabold text-slate-900">{t('dashboard.settings.webhooks.addEndpoint')}</h3>
        <WebhookActions type="create" />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {webhooks.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">{t('dashboard.settings.webhooks.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t('dashboard.settings.webhooks.table.url')}</th>
                  <th className="px-4 py-3">{t('dashboard.settings.webhooks.table.events')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">{webhook.url}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{webhook.subscriptions.join(', ')}</td>
                    <td className="px-4 py-3 text-right"><WebhookActions type="delete" webhookId={webhook.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
