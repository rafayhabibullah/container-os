import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';
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

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'warning',
  pending_signature: 'default',
  confirmed: 'success',
  expired: 'outline',
  cancelled: 'destructive',
  converted: 'success',
};

export default async function ReservationsPage() {
  const user = await requireAuth();
  const reservations = await serverFetch<Reservation[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as Reservation[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reservations</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search reservations…</span>
        </div>
      </div>

      {/* Table / empty state */}
      {reservations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No reservations yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  ID
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Customer
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Move-in
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Expires
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {reservations.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                    {r.id.slice(0, 12)}…
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">
                    {r.customerId.slice(0, 10)}…
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {new Date(r.startDate).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {new Date(r.expiresAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'}>
                      {r.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ReservationActions reservation={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {reservations.length} of {reservations.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
