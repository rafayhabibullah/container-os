import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import WebhookActions from './WebhookActions';
import Link from 'next/link';

interface Webhook { id: string; url: string; subscriptions: string[]; status: string; }

export default async function WebhooksPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');

  const webhooks = await serverFetch<Webhook[]>(`/v1/organisations/${user.organisationId}/webhooks`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Settings</Link>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
        </div>
        <div className="bg-white rounded-2xl shadow mb-6 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Add endpoint</h2>
          <WebhookActions type="create" />
        </div>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {webhooks.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No webhook endpoints configured.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">URL</th>
                  <th className="text-left px-6 py-3">Events</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{wh.url}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{wh.subscriptions.join(', ')}</td>
                    <td className="px-6 py-4 text-right">
                      <WebhookActions type="delete" webhookId={wh.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
