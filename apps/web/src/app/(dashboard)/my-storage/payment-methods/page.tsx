import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';

interface Mandate {
  id: string;
  scheme: string;
  status: string;
  ibanLast4: string | null;
  signedAt: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'outline'> = {
  pending: 'default',
  active: 'success',
  cancelled: 'destructive',
  revoked: 'outline',
};

export default async function PaymentMethodsPage() {
  await requireAuth();
  const mandates = await serverFetch<Mandate[]>(`/v1/tenant/mandates`).catch(() => [] as Mandate[]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Payment Methods</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your registered SEPA direct debit mandates</p>
      </div>

      {mandates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-500">No payment methods registered.</p>
          <p className="text-xs text-slate-400 mt-2">Your operator will set up a payment mandate when you sign your contract.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {mandates.map((mandate, i) => (
            <div key={mandate.id}
              className={`flex items-center justify-between px-5 py-4 ${i < mandates.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div>
                <p className="font-medium text-slate-900 capitalize">
                  {mandate.scheme.replace(/_/g, ' ')}
                  {mandate.ibanLast4 && <span className="text-slate-400 font-normal ml-2">···· {mandate.ibanLast4}</span>}
                </p>
                {mandate.signedAt && (
                  <p className="text-xs text-slate-400 mt-0.5">Signed {new Date(mandate.signedAt).toLocaleDateString('de-DE')}</p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[mandate.status] ?? 'default'}>{mandate.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
