'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitIncidentReport } from './actions';
import { useT } from '@/lib/i18n';

interface Agreement {
  id: string;
  unitId: string;
  status: string;
  unit: { unitCode: string } | null;
}

export default function ReportProblemForm({
  agreements,
  defaultAgreementId,
}: {
  agreements: Agreement[];
  defaultAgreementId: string;
}) {
  const t = useT();
  const INCIDENT_TYPES = [
    { value: 'unit_damage', label: t('myStorage.reportProblem.incidentTypes.unitDamage') },
    { value: 'access_issue', label: t('myStorage.reportProblem.incidentTypes.accessIssue') },
    { value: 'security_concern', label: t('myStorage.reportProblem.incidentTypes.securityConcern') },
    { value: 'facility_issue', label: t('myStorage.reportProblem.incidentTypes.facilityIssue') },
    { value: 'other', label: t('myStorage.reportProblem.incidentTypes.other') },
  ];

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
      await submitIncidentReport({ agreementId, type, description });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('myStorage.reportProblem.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>✓</div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>{t('myStorage.reportProblem.successTitle')}</h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px' }}>{t('myStorage.reportProblem.successBody')}</p>
        <Link href="/my-storage" style={{ display: 'inline-block', background: '#0f172a', color: '#ffffff', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          {t('myStorage.reportProblem.backToMyStorage')}
        </Link>
      </div>
    );
  }

  const canSubmit = !!agreementId && !!type && !!description.trim() && !submitting;

  return (
    <form onSubmit={handleSubmit} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('myStorage.reportProblem.unitLabel')}</label>
        {agreements.length > 1 ? (
          <select
            value={agreementId}
            onChange={(e) => setAgreementId(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: agreementId ? '#0f172a' : '#94a3b8', background: '#ffffff', outline: 'none' }}
          >
            <option value="">{t('myStorage.reportProblem.selectUnit')}</option>
            {agreements.map((a) => (
              <option key={a.id} value={a.id}>
                {t('myStorage.reportProblem.unitOption', { code: a.unit?.unitCode ?? a.unitId.slice(0, 8) })}
              </option>
            ))}
          </select>
        ) : agreements.length === 1 ? (
          <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#0f172a', background: '#f8fafc', fontWeight: 600 }}>
            {t('myStorage.reportProblem.unitOption', { code: agreements[0].unit?.unitCode ?? agreements[0].unitId.slice(0, 8) })}
          </div>
        ) : (
          <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#94a3b8', background: '#f8fafc' }}>
            {t('myStorage.reportProblem.noActiveRental')}
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('myStorage.reportProblem.problemTypeLabel')}</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', color: type ? '#0f172a' : '#94a3b8', background: '#ffffff', outline: 'none' }}
        >
          <option value="">{t('myStorage.reportProblem.selectType')}</option>
          {INCIDENT_TYPES.map((tOpt) => (
            <option key={tOpt.value} value={tOpt.value}>{tOpt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('myStorage.reportProblem.descriptionLabel')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          placeholder={t('myStorage.reportProblem.descriptionPlaceholder')}
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
        {submitting ? t('myStorage.reportProblem.submitting') : t('myStorage.reportProblem.submit')}
      </button>
    </form>
  );
}
