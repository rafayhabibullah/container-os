'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface InvoiceRow {
  id: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  agreement: {
    customer: {
      id: string;
      personOrOrgData: {
        firstName?: string;
        lastName?: string;
        companyName?: string;
        name?: string;
      };
    };
  };
}

const STATUS_PILL: Record<string, { dot: string; color: string; bg: string; border: string }> = {
  pending:  { dot: '#f59e0b', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  sent:     { dot: '#0ea5e9', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  paid:     { dot: '#16a34a', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  overdue:  { dot: '#f87171', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  void:     { dot: '#cbd5e1', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

function tenantName(customer: InvoiceRow['agreement']['customer']) {
  const d = customer.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || customer.id;
}

export function InvoicesTable({
  invoices,
  labels,
  statusLabels,
}: {
  invoices: InvoiceRow[];
  labels: {
    searchPlaceholder: string;
    customer: string;
    invoiceDate: string;
    dueDate: string;
    amount: string;
    status: string;
    view: string;
    emptyTitle: string;
    emptyHint: string;
    noResults: string;
  };
  statusLabels: Record<string, string>;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const name = tenantName(inv.agreement.customer).toLowerCase();
      const status = (statusLabels[inv.status] ?? inv.status).toLowerCase();
      return (
        name.includes(q) ||
        inv.id.toLowerCase().includes(q) ||
        status.includes(q) ||
        formatMinor(inv.totalMinor, inv.currency).toLowerCase().includes(q)
      );
    });
  }, [invoices, query, statusLabels]);

  return (
    <>
      {/* Search bar */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#94a3b8', flexShrink: 0 }}>
          <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder={labels.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }}
        />
      </div>

      {/* Table / empty state */}
      {invoices.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>{labels.emptyTitle}</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{labels.emptyHint}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{labels.noResults}</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{labels.customer}</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{labels.invoiceDate}</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{labels.dueDate}</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{labels.amount}</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{labels.status}</th>
                <th style={{ padding: '10px 16px' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const pill = STATUS_PILL[inv.status] ?? STATUS_PILL.void;
                return (
                  <tr key={inv.id} className="tbl-row" style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>
                      {tenantName(inv.agreement.customer)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {new Date(inv.invoiceDate).toLocaleDateString('de-DE')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {new Date(inv.dueDate).toLocaleDateString('de-DE')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      {formatMinor(inv.totalMinor, inv.currency)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600, color: pill.color, background: pill.bg, border: `1px solid ${pill.border}`,
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
                        {statusLabels[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link href={`/invoices/${inv.id}`} style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                        {labels.view}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
