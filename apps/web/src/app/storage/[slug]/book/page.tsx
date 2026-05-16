'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UnitType {
  id: string;
  name: string;
  sizeSqm: number;
  features: string[];
}

interface BookingWizardProps {
  params: { slug: string };
  searchParams: { siteId?: string; unitTypes?: string };
}

type Step = 'unit' | 'contact' | 'confirm';

interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
}

interface BookingResult {
  reservationId: string;
  status: string;
  expiresAt: string;
}

export default function BookPage({ params, searchParams }: BookingWizardProps) {
  const siteId = searchParams.siteId ?? '';
  const unitTypes: UnitType[] = searchParams.unitTypes ? JSON.parse(decodeURIComponent(searchParams.unitTypes)) : [];

  const [step, setStep] = useState<Step>('unit');
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(unitTypes[0] ?? null);
  const [moveInDate, setMoveInDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [sessionId, setSessionId] = useState<string>('');
  const [contact, setContact] = useState<ContactDetails>({ name: '', email: '', phone: '', marketingConsent: false });
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleUnitSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUnitType) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, unitTypeId: selectedUnitType.id, startDate: moveInDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed to start checkout');
      if (data.availabilityState === 'sold_out') {
        setError('Sorry, no units of this type are available right now.');
        setLoading(false);
        return;
      }
      setSessionId(data.checkoutSessionId);
      setStep('contact');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/checkout/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed to confirm booking');
      setResult(data);
      setStep('confirm');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const stepLabels: { key: Step; label: string }[] = [
    { key: 'unit', label: '1. Choose unit' },
    { key: 'contact', label: '2. Your details' },
    { key: 'confirm', label: '3. Confirmation' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">SiteLager</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="max-w-xl">
        <Link href={`/storage/${params.slug}`} className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">
          &larr; Back to site
        </Link>

        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map(({ key, label }, i) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`text-sm font-medium ${step === key ? 'text-blue-600' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < stepLabels.length - 1 && <span className="text-slate-300">/</span>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {step === 'unit' && (
            <form onSubmit={handleUnitSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">Choose your unit</h2>

              {unitTypes.length > 0 ? (
                <div className="space-y-3">
                  {unitTypes.map((ut) => (
                    <label key={ut.id} className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${selectedUnitType?.id === ut.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="unitType"
                        value={ut.id}
                        checked={selectedUnitType?.id === ut.id}
                        onChange={() => setSelectedUnitType(ut)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{ut.name}</p>
                        <p className="text-sm text-slate-500">{ut.sizeSqm} m²</p>
                        {ut.features.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">{ut.features.join(' · ')}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No unit types available for this site.</p>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Desired move-in date</label>
                <input
                  type="date"
                  value={moveInDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !selectedUnitType}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? 'Checking availability…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'contact' && (
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Your contact details</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Anna Müller"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="anna@example.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="+49 170 123 4567"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contact.marketingConsent}
                  onChange={(e) => setContact({ ...contact, marketingConsent: e.target.checked })}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-600">I agree to receive marketing communications (optional)</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('unit')}
                  className="flex-1 border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {loading ? 'Confirming…' : 'Confirm booking'}
                </button>
              </div>
            </form>
          )}

          {step === 'confirm' && result && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Booking confirmed!</h2>
              <p className="text-slate-500 text-sm">
                A confirmation email has been sent to <strong>{contact.email}</strong>.
              </p>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reservation ID</span>
                  <span className="font-mono text-xs text-slate-700">{result.reservationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="text-slate-700 capitalize">{result.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reserved until</span>
                  <span className="text-slate-700">{new Date(result.expiresAt).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                The operator will be in touch to finalise your agreement and arrange access.
              </p>
              <Link
                href={`/storage/${params.slug}`}
                className="inline-block mt-2 text-blue-600 text-sm hover:underline"
              >
                &larr; Back to site
              </Link>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
