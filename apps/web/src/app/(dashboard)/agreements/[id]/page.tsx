import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AgreementDetailActions from './AgreementDetailActions';

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface Amendment { id: string; type: string; effectiveFrom: string; }
interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  reservationId: string;
  status: string;
  billingCycle: string;
  language: string;
  effectiveFrom: string | null;
  pricingSnapshot: Record<string, unknown>;
  terminationRules: Record<string, unknown>;
  createdAt: string;
  signatories: Signatory[];
  amendments: Amendment[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

export default async function AgreementDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const agreement = await serverFetch<Agreement>(
    `/v1/organisations/${user.organisationId}/agreements/${params.id}`,
  ).catch(() => null);

  if (!agreement) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/agreements" className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">&larr; Agreements</Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agreement</h1>
            <p className="text-xs font-mono text-slate-400 mt-1">{agreement.id}</p>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[agreement.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {agreement.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide">Details</p>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-slate-500">Billing cycle</dt><dd className="text-slate-700 capitalize">{agreement.billingCycle.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Language</dt><dd className="text-slate-700 uppercase">{agreement.language}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Effective from</dt><dd className="text-slate-700">{agreement.effectiveFrom ? new Date(agreement.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="text-slate-700">{new Date(agreement.createdAt).toLocaleDateString('de-DE')}</dd></div>
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide">Pricing snapshot</p>
            <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(agreement.pricingSnapshot, null, 2)}</pre>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Signatories</p>
          {agreement.signatories.length === 0 ? (
            <p className="text-slate-500 text-sm">No signatories assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {agreement.signatories.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-slate-600">{s.personId}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'signed' ? 'bg-green-100 text-green-700' : s.status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {agreement.amendments.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Amendments</p>
            <ul className="space-y-2">
              {agreement.amendments.map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{a.type}</span>
                  <span className="text-slate-400 text-xs">{new Date(a.effectiveFrom).toLocaleDateString('de-DE')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Actions</p>
          <AgreementDetailActions agreement={agreement} />
        </div>
      </div>
    </div>
  );
}
