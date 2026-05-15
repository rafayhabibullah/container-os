import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';
import { BookingActions } from './BookingActions';

interface BookingRow {
  id: string;
  status: string;
  source: string;
  startDate: string;
  expiresAt: string;
  createdAt: string;
  customerId: string;
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

export default async function BookingsPage() {
  const user = await requireAuth();
  const bookings = await serverFetch<BookingRow[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as BookingRow[]);

  const pending = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {bookings.length} total · {pending} pending approval
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search bookings…</span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No bookings yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Booking ID', 'Source', 'Move-in', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking, i) => (
                <tr key={booking.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{booking.id.slice(0, 12)}…</td>
                  <td className="px-4 py-3">
                    <Badge variant={booking.source === 'marketplace' ? 'success' : 'default'}>
                      {booking.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(booking.startDate).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[booking.status] ?? 'default'}>{booking.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <BookingActions reservationId={booking.id} orgId={user.organisationId} status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
