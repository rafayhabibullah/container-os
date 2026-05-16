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
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`.tbl-row:hover { background: #f8fafc; }`}</style>
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <Link
              href="/settings"
              style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}
            >
              &larr; Settings
            </Link>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Webhooks
            </h1>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Add endpoint</h2>
            <WebhookActions type="create" />
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            {webhooks.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '48px 24px', margin: 0 }}>
                No webhook endpoints configured.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>URL</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Events</th>
                    <th style={{ padding: '10px 16px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((wh) => (
                    <tr key={wh.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#0f172a' }}>{wh.url}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>{wh.subscriptions.join(', ')}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
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
    </>
  );
}
