'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReservationSummary {
  id: string;
  status: string;
  source: string;
  startDate: string;
  expiresAt: string;
  createdAt: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  unitId: string;
  unitTypeId: string;
  siteId: string;
}

interface ReservationDetails extends ReservationSummary {
  customerPhone: string | null;
  customerType: string | null;
  unit: { id: string; unitCode: string; kind: string; status: string; driveUp: boolean; conditionState: string | null; photoUrl: string | null } | null;
  unitType: { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[] } | null;
  site: { id: string; name: string; slug: string; address: { street: string; city: string; postalCode: string; country: string }; status: string; timezone: string; currency: string } | null;
}

const STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  pending:           { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Pending'           },
  pending_signature: { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Pending signature' },
  confirmed:         { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Confirmed'         },
  converted:         { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Converted'         },
  cancelled:         { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Cancelled'         },
  expired:           { dot: '#cbd5e1', text: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', label: 'Expired'           },
};

const UNIT_STATUS: Record<string, { bg: string; color: string }> = {
  available:   { bg: '#f0fdf4', color: '#15803d' },
  occupied:    { bg: '#eff6ff', color: '#1d4ed8' },
  maintenance: { bg: '#fff7ed', color: '#c2410c' },
  reserved:    { bg: '#faf5ff', color: '#6d28d9' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{value ?? <span style={{ color: '#cbd5e1' }}>—</span>}</span>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.03em' }}>{title}</span>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 500, color: '#475569' }}>
      {label}
    </span>
  );
}

function SkeletonLine({ width = '100%', height = 14 }: { width?: string; height?: number }) {
  return <div style={{ width, height, background: '#f1f5f9', borderRadius: '4px', animation: 'skeleton-pulse 1.4s ease infinite' }} />;
}

export default function ReservationDrawer({ reservation, onClose }: { reservation: ReservationSummary; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<ReservationDetails | null>(null);
  const [fetching, setFetching] = useState(true);

  const stat = STATUS[reservation.status] ?? STATUS.expired;
  const isTerminal = ['cancelled', 'expired', 'converted'].includes(reservation.status);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setFetching(true);
    fetch(`/api/reservations/${reservation.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: ReservationDetails) => setDetails(data))
      .catch(() => setDetails(null))
      .finally(() => setFetching(false));
  }, [reservation.id]);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/reservations/${reservation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    onClose();
    router.refresh();
  }

  async function createAgreement() {
    setLoading(true);
    const res = await fetch(`/api/reservations/${reservation.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'agreement' },
      body: JSON.stringify({ billingCycle: 'monthly', language: 'de', pricingSnapshot: {} }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.agreementId) router.push('/agreements');
    else { onClose(); router.refresh(); }
  }

  const btnBase: React.CSSProperties = {
    flex: 1, padding: '9px 14px', borderRadius: '8px', fontSize: '13px',
    fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1, fontFamily: 'inherit', border: 'none',
  };

  const unit     = details?.unit;
  const unitType = details?.unitType;
  const site     = details?.site;
  const unitStatusStyle = unit ? (UNIT_STATUS[unit.status] ?? { bg: '#f8fafc', color: '#64748b' }) : null;

  const customerName  = details?.customerName  ?? reservation.customerName;
  const customerEmail = details?.customerEmail ?? reservation.customerEmail;

  return (
    <>
      <style>{`
        @keyframes drawer-backdrop  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes drawer-slide     { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes skeleton-pulse   { 0%, 100% { opacity: 1 } 50% { opacity: 0.45 } }
        .res-drawer-backdrop { animation: drawer-backdrop 0.2s ease both; }
        .res-drawer-panel    { animation: drawer-slide 0.25s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* Backdrop */}
      <div
        className="res-drawer-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 40, backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div
        className="res-drawer-panel"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '440px',
          background: '#ffffff', zIndex: 50, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Reservation</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>{reservation.id}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`,
                borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 600,
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, flexShrink: 0 }} />
                {stat.label}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>via {reservation.source}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, color: '#64748b',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Customer */}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title="Customer" icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            } />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '14px', fontWeight: 700, flexShrink: 0,
              }}>
                {(customerName ?? reservation.customerId).slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{customerName ?? '—'}</div>
                {customerEmail && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{customerEmail}</div>}
                {details?.customerPhone && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>{details.customerPhone}</div>}
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{reservation.customerId}</div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Move-in date" value={fmt(reservation.startDate)} />
            <Field label="Expires" value={fmt(reservation.expiresAt)} />
            <Field label="Created" value={fmtTime(reservation.createdAt)} />
          </div>

          {/* Unit */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title="Unit" icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="#64748b" strokeWidth="1.8"/><path d="M8 21h8M12 17v4" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/></svg>
            } />
            {fetching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonLine width="40%" />
                <SkeletonLine width="70%" />
                <SkeletonLine width="55%" />
              </div>
            ) : !details ? (
              <span style={{ fontSize: '12px', color: '#f87171' }}>Could not load — check the API server is running.</span>
            ) : unit ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Unit code" value={<span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px' }}>{unit.unitCode}</span>} />
                <Field label="Kind" value={unit.kind.replace(/_/g, ' ')} />
                <Field label="Status" value={
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', background: unitStatusStyle!.bg, color: unitStatusStyle!.color, fontSize: '12px', fontWeight: 600 }}>
                    {unit.status}
                  </span>
                } />
                <Field label="Drive-up" value={unit.driveUp ? 'Yes' : 'No'} />
                {unit.conditionState && <Field label="Condition" value={unit.conditionState} />}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>{reservation.unitId}</span>
            )}
          </div>

          {/* Unit Type */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title="Unit type" icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round"/></svg>
            } />
            {fetching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonLine width="60%" />
                <SkeletonLine width="45%" />
              </div>
            ) : !details ? (
              <span style={{ fontSize: '12px', color: '#f87171' }}>Could not load — check the API server is running.</span>
            ) : unitType ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Field label="Name" value={<span style={{ fontWeight: 700 }}>{unitType.name}</span>} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Size" value={`${unitType.sizeSqm} m²${unitType.sizeCbm ? ` / ${unitType.sizeCbm} m³` : ''}`} />
                  <Field label="Door type" value={unitType.doorType?.replace(/_/g, ' ') ?? null} />
                </div>
                {unitType.features.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Features</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {unitType.features.map((f) => <Chip key={f} label={f.replace(/_/g, ' ')} />)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>{reservation.unitTypeId}</span>
            )}
          </div>

          {/* Site */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <SectionHeader title="Site" icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-6.75-7-11a7 7 0 1 1 14 0c0 4.25-7 11-7 11z" stroke="#64748b" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.5" stroke="#64748b" strokeWidth="1.8"/></svg>
            } />
            {fetching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonLine width="50%" />
                <SkeletonLine width="80%" />
                <SkeletonLine width="40%" />
              </div>
            ) : !details ? (
              <span style={{ fontSize: '12px', color: '#f87171' }}>Could not load — check the API server is running.</span>
            ) : site ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Field label="Name" value={<span style={{ fontWeight: 700 }}>{site.name}</span>} />
                <Field label="Address" value={`${site.address.street}, ${site.address.postalCode} ${site.address.city}, ${site.address.country}`} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Field label="Status" value={site.status} />
                  <Field label="Currency" value={site.currency} />
                  <Field label="Timezone" value={site.timezone} />
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>{reservation.siteId}</span>
            )}
          </div>

        </div>

        {/* Actions footer */}
        {!isTerminal && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
            {reservation.status === 'pending_signature' && (
              <button onClick={() => updateStatus('confirmed')} disabled={loading} style={{ ...btnBase, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                Confirm
              </button>
            )}
            {reservation.status === 'confirmed' && (
              <button onClick={createAgreement} disabled={loading} style={{ ...btnBase, background: '#faf5ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                Create agreement
              </button>
            )}
            <button onClick={() => updateStatus('cancelled')} disabled={loading} style={{ ...btnBase, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}
