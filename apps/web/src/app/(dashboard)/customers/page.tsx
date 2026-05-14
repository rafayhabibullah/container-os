import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface Customer {
  id: string;
  type: 'person' | 'organisation';
  personOrOrgData: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    name?: string;
    email?: string;
  };
  createdAt: string;
}

function displayName(c: Customer): string {
  const d = c.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || c.id;
}

export default async function CustomersPage() {
  const user = await requireAuth();
  const customers = await serverFetch<Customer[]>(
    `/v1/organisations/${user.organisationId}/customers`,
  ).catch(() => [] as Customer[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search customers…</span>
        </div>
      </div>

      {/* Table / empty state */}
      {customers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No customers yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Since
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, i) => (
                <tr
                  key={customer.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {displayName(customer)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {customer.personOrOrgData.email ?? '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={customer.type === 'person' ? 'default' : 'outline'}>
                      {customer.type}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {new Date(customer.createdAt).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {customers.length} of {customers.length}
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
