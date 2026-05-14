import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import ReservationActions from './ReservationActions';

interface Reservation {
  id: string;
  siteId: string;
  unitId: string;
  unitTypeId: string;
  customerId: string;
  status: 'pending' | 'pending_signature' | 'confirmed' | 'expired' | 'cancelled' | 'converted';
  startDate: string;
  expiresAt: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  pending_signature: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
  converted: 'bg-purple-100 text-purple-700',
};

export default async function ReservationsPage() {
  const user = await requireAuth();
  const reservations = await serverFetch<Reservation[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as Reservation[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Reservations</h1>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No reservations yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Customer</th>
                  <th className="text-left px-6 py-3">Move-in</th>
                  <th className="text-left px-6 py-3">Expires</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{r.id.slice(0, 12)}…</td>
                    <td className="px-6 py-4 text-slate-700 font-mono text-xs">{r.customerId.slice(0, 10)}…</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(r.startDate).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(r.expiresAt).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ReservationActions reservation={r} />
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
