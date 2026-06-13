'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/i18n';
import IncidentActions from './IncidentActions';

interface Incident {
  id: string;
  type: string;
  status: string;
  severity: string;
  siteId: string;
  unitId: string | null;
  unit: { unitCode: string } | null;
  tenant: { personOrOrgData: Record<string, string>; contacts: { email: string }[] } | null;
  createdAt: string;
}

interface Site {
  id: string;
  name: string;
}

const SEV: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  critical: { dot: '#dc2626', text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  high:     { dot: '#ea580c', text: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  medium:   { dot: '#ca8a04', text: '#92400e', bg: '#fefce8', border: '#fde68a' },
  low:      { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
};

const STAT: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  open:          { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  investigating: { dot: '#8b5cf6', text: '#6d28d9', bg: '#faf5ff', border: '#ddd6fe' },
  resolved:      { dot: '#94a3b8', text: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
};

const FILTER_KEYS = ['all', 'open', 'investigating', 'resolved'] as const;

function timeAgo(iso: string, t: ReturnType<typeof useT>): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 60) return t('dashboard.incidents.timeAgo.minutes', { count: String(m) });
  const h = Math.floor(m / 60);
  if (h < 24) return t('dashboard.incidents.timeAgo.hours', { count: String(h) });
  const d = Math.floor(h / 24);
  return d === 1 ? t('dashboard.incidents.timeAgo.yesterday') : t('dashboard.incidents.timeAgo.days', { count: String(d) });
}

function IncidentDetailPanel({ incident, siteName, onClose }: { incident: Incident; siteName: string; onClose: () => void }) {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sev  = SEV[incident.severity]  ?? SEV.low;
  const stat = STAT[incident.status]   ?? STAT.resolved;

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes inc-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes inc-panel-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .inc-detail-backdrop { animation: inc-backdrop-in 0.18s ease both; }
        .inc-detail-panel    { animation: inc-panel-in 0.25s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div
        className="inc-detail-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(2px)', zIndex: 50 }}
      />

      <div
        className="inc-detail-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '400px',
          background: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          boxShadow: '-8px 0 40px rgba(15,23,42,0.12)',
          zIndex: 51,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              {incident.type}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: sev.bg, color: sev.text, border: `1px solid ${sev.border}`,
                borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: 600,
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: sev.dot, display: 'inline-block' }} />
                {t(`dashboard.incidents.severity.${incident.severity}`)}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`,
                borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: 600,
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block' }} />
                {t(`dashboard.incidents.status.${incident.status}`)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '6px', width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[
            { label: t('dashboard.incidents.detail.incidentId'), value: incident.id },
            { label: t('dashboard.incidents.detail.site'),        value: siteName },
            ...(incident.unit ? [{ label: t('dashboard.incidents.detail.unit'), value: incident.unit.unitCode }] : []),
            { label: t('dashboard.incidents.detail.reported'),    value: new Date(incident.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                {label}
              </p>
              <p style={{ fontSize: '14px', color: '#0f172a', margin: 0, wordBreak: 'break-all' }}>
                {value}
              </p>
            </div>
          ))}

          {incident.tenant && (() => {
            const d = incident.tenant.personOrOrgData;
            const name = d.companyName ?? [d.firstName, d.lastName].filter(Boolean).join(' ');
            const email = incident.tenant.contacts[0]?.email;
            return (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                  {t('dashboard.incidents.detail.reportedBy')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: '#475569', flexShrink: 0,
                  }}>
                    {(d.firstName?.[0] ?? d.companyName?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{name}</p>
                    {email && <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>{email}</p>}
                  </div>
                </div>
              </div>
            );
          })()}

          {incident.status !== 'resolved' && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                {t('dashboard.incidents.detail.actions')}
              </p>
              <IncidentActions type="update" incidentId={incident.id} currentStatus={incident.status} />
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

export default function IncidentsTable({ incidents, sites = [] }: { incidents: Incident[]; sites?: Site[] }) {
  const t = useT();
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected,     setSelected]     = useState<Incident | null>(null);

  const siteMap = new Map(sites.map((s) => [s.id, s.name]));

  const filtered = useMemo(() =>
    incidents.filter((inc) => {
      const q      = query.trim().toLowerCase();
      const matchQ = !q || inc.type.toLowerCase().includes(q) || inc.siteId.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || inc.status === statusFilter;
      return matchQ && matchS;
    }),
    [incidents, query, statusFilter],
  );

  return (
    <>
      <style>{`
        @keyframes row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .inc-row { animation: row-in 0.25s ease both; }
        .inc-row:hover { background: #f8fafc !important; }
        .filter-tab { transition: all 0.15s ease; }
        .filter-tab:hover { color: #0f172a !important; }
        .action-ghost { transition: all 0.12s ease; }
        .action-ghost:hover { background: #f1f5f9 !important; color: #0f172a !important; }
        .search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      {/* White card container */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap',
        }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '2px' }}>
            {FILTER_KEYS.map((key) => {
              const active = statusFilter === key;
              const count  = key === 'all' ? incidents.length : incidents.filter((i) => i.status === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className="filter-tab"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? '#f1f5f9' : 'transparent',
                    color: active ? '#0f172a' : '#94a3b8',
                    fontSize: '13px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {t(`dashboard.incidents.filters.${key}`)}
                  <span style={{
                    background: active ? '#e2e8f0' : '#f8fafc',
                    color: active ? '#475569' : '#cbd5e1',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    minWidth: '20px',
                    textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div
            className="search-box"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '7px 12px',
              minWidth: '220px', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('dashboard.incidents.searchPlaceholder')}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#0f172a', fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', lineHeight: 1, padding: '1px' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '10px',
              background: '#f1f5f9', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 12px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {incidents.length === 0 ? t('dashboard.incidents.empty.noIncidents') : t('dashboard.incidents.empty.noResults')}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {incidents.length === 0 ? t('dashboard.incidents.empty.willAppear') : t('dashboard.incidents.empty.adjustFilter')}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {[
                  t('dashboard.incidents.table.severity'),
                  t('dashboard.incidents.table.incident'),
                  t('dashboard.incidents.table.site'),
                  t('dashboard.incidents.table.unit'),
                  t('dashboard.incidents.table.status'),
                  t('dashboard.incidents.table.reported'),
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: '11px',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      color: '#94a3b8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc, i) => {
                const sev  = SEV[inc.severity]  ?? SEV.low;
                const stat = STAT[inc.status]   ?? STAT.resolved;
                return (
                  <tr
                    key={inc.id}
                    className="inc-row"
                    onClick={() => setSelected(inc)}
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Severity */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: sev.bg, color: sev.text,
                        border: `1px solid ${sev.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: sev.dot, flexShrink: 0, display: 'inline-block',
                        }} />
                        {t(`dashboard.incidents.severity.${inc.severity}`)}
                      </span>
                    </td>

                    {/* Incident type */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '14px', fontWeight: 600, color: '#0f172a',
                      }}>
                        {inc.type}
                      </span>
                    </td>

                    {/* Site */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', color: '#64748b',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '5px', padding: '2px 8px',
                      }}>
                        {siteMap.get(inc.siteId) ?? inc.siteId.slice(0, 8) + '…'}
                      </span>
                    </td>

                    {/* Unit */}
                    <td style={{ padding: '12px 16px' }}>
                      {inc.unit ? (
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '13px', color: '#64748b',
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderRadius: '5px', padding: '2px 8px',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {inc.unit.unitCode}
                        </span>
                      ) : (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#cbd5e1' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: stat.bg, color: stat.text,
                        border: `1px solid ${stat.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{
                          width: '5px', height: '5px', borderRadius: '50%',
                          background: stat.dot, flexShrink: 0, display: 'inline-block',
                        }} />
                        {t(`dashboard.incidents.status.${inc.status}`)}
                      </span>
                    </td>

                    {/* Time */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', color: '#94a3b8',
                      }}>
                        {timeAgo(inc.createdAt, t)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {inc.status !== 'resolved' && (
                        <IncidentActions type="update" incidentId={inc.id} currentStatus={inc.status} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && <IncidentDetailPanel incident={selected} siteName={siteMap.get(selected.siteId) ?? selected.siteId} onClose={() => setSelected(null)} />}
    </>
  );
}
