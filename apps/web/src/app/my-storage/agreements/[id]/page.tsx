import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface Agreement {
  id: string;
  unitId: string;
  siteId: string;
  status: string;
  billingCycle: string;
  language: string;
  effectiveFrom: string | null;
  pricingSnapshot: Record<string, unknown>;
  terminationRules: Record<string, unknown>;
  createdAt: string;
  signatories: Signatory[];
}

const STATUS_STYLES: Record<string, string> = {
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

export default async function TenantAgreementPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const agreement = await serverFetch<Agreement>(`/v1/tenant/agreements/${params.id}`).catch(() => null);
  if (!agreement) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/my-storage" className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">&larr; My Storage</Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Storage Agreement</h1>
            <p className="text-xs font-mono text-slate-400 mt-1">{agreement.id}</p>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[agreement.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {agreement.status.replace('_', ' ')}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-4 space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Unit</dt><dd className="text-slate-700 font-mono text-xs">{agreement.unitId}</dd></div>
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Billing cycle</dt><dd className="text-slate-700 capitalize">{agreement.billingCycle.replace('_', ' ')}</dd></div>
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Start date</dt><dd className="text-slate-700">{agreement.effectiveFrom ? new Date(agreement.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd></div>
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Language</dt><dd className="text-slate-700 uppercase">{agreement.language}</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Termination rules</p>
          <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(agreement.terminationRules, null, 2)}</pre>
        </div>

        {agreement.signatories.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-4">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Signatories</p>
            <ul className="space-y-2">
              {agreement.signatories.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-slate-600">{s.personId}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status}{s.signedAt ? ` · ${new Date(s.signedAt).toLocaleDateString('de-DE')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
