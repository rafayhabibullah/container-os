'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Agreement {
  id: string;
  unitId: string;
  status: string;
  unit: { unitCode: string } | null;
}

const INCIDENT_TYPES = [
  { value: 'unit_damage', label: 'Damage to unit or contents' },
  { value: 'access_issue', label: 'Cannot access my unit' },
  { value: 'security_concern', label: 'Security concern' },
  { value: 'facility_issue', label: 'Facility or building problem' },
  { value: 'other', label: 'Other' },
];

export default function ReportProblemForm({
  agreements,
  defaultAgreementId,
}: {
  agreements: Agreement[];
  defaultAgreementId: string;
}) {
  const initialId = defaultAgreementId || (agreements.length === 1 ? agreements[0].id : '');
  const [agreementId, setAgreementId] = useState(initialId);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreementId || !type || !description.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/tenant/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId, type, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Something went wrong');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>✓</div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Report submitted</h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px' }}>Our team has been notified and will look into this shortly.</p>
        <Link href="/my-storage" style={{ display: 'inline-block', background: '#0f172a', color: '#ffffff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          Back to My Storage
        </Link>
      </div>
    );
  }

  const canSubmit = !!agreementId && !!type && !!description.trim() && !submitting;

  return (
    <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {agreements.length > 1 && (
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit</label>
          <select
            value={agreementId}
            onChange={(e) => setAgreementId(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: agreementId ? '#0f172a' : '#94a3b8', background: '#ffffff', outline: 'none' }}
          >
            <option value="">Select a unit…</option>
            {agreements.map((a) => (
              <option key={a.id} value={a.id}>
                Unit {a.unit?.unitCode ?? a.unitId.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Problem type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: type ? '#0f172a' : '#94a3b8', background: '#ffffff', outline: 'none' }}
        >
          <option value="">Select a type…</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          placeholder="Please describe the issue in as much detail as possible…"
          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#0f172a', background: '#ffffff', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{ background: canSubmit ? '#dc2626' : '#e2e8f0', color: canSubmit ? '#ffffff' : '#94a3b8', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', transition: 'background 0.15s' }}
      >
        {submitting ? 'Submitting…' : 'Submit report'}
      </button>
    </form>
  );
}
