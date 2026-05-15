import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search, Plus } from 'lucide-react';
import { ListingActions } from './ListingActions';

interface ListingRow {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'paused' | 'fully_booked' | 'archived';
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  publicPriceMinor: number | null;
  showPrice: boolean;
  site: { name: string };
  unit: { unitCode: string };
  createdAt: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'default',
  published: 'success',
  paused: 'warning',
  fully_booked: 'outline',
  archived: 'outline',
};

const BOOKING_MODE_LABEL: Record<string, string> = {
  approval_required: 'Approval',
  instant_booking: 'Instant',
  request_price: 'Quote',
};

export default async function ListingsPage() {
  const user = await requireAuth();
  const listings = await serverFetch<ListingRow[]>(
    `/v1/organisations/${user.organisationId}/listings`,
  ).catch(() => [] as ListingRow[]);

  const active = listings.filter((l) => l.status !== 'archived');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Marketplace Listings</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {active.length} listing{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New listing
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search listings…</span>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No listings yet. Create one to publish units to the marketplace.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Title', 'Site', 'Unit', 'Mode', 'Price', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map((listing, i) => (
                <tr
                  key={listing.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{listing.title}</td>
                  <td className="px-4 py-3 text-slate-600">{listing.site.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{listing.unit.unitCode}</td>
                  <td className="px-4 py-3 text-slate-600">{BOOKING_MODE_LABEL[listing.bookingMode]}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {listing.showPrice && listing.publicPriceMinor != null
                      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(listing.publicPriceMinor / 100)
                      : <span className="text-slate-400">Hidden</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[listing.status]}>{listing.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ListingActions listingId={listing.id} orgId={user.organisationId} status={listing.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">{listings.length} listing{listings.length !== 1 ? 's' : ''} total</span>
          </div>
        </div>
      )}
    </div>
  );
}
