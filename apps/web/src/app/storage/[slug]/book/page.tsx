'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { TrackMarketplaceEvent } from '../../MarketplaceActions';

interface UnitType {
  id: string;
  name: string;
  sizeSqm: number;
  features: string[];
}

interface BookingWizardProps {
  params: { slug: string };
  searchParams: { siteId?: string; listingId?: string; listingSlug?: string; unitTypes?: string };
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
  nextStep?: string;
  pricingSnapshot?: { rentMinor?: number; depositMinor?: number } | null;
}

export default function BookPage({ params, searchParams }: BookingWizardProps) {
  const t = useT();
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
        body: JSON.stringify({ siteId, listingId: searchParams.listingId, listingSlug: searchParams.listingSlug ?? params.slug, unitTypeId: selectedUnitType.id, startDate: moveInDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? t('storage.book.errors.checkoutFailed'));
      if (data.availabilityState === 'sold_out') {
        setError(t('storage.book.errors.soldOut'));
        setLoading(false);
        return;
      }
      setSessionId(data.checkoutSessionId);
      setStep('contact');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('storage.book.errors.generic'));
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
      if (!res.ok) throw new Error(data?.message ?? t('storage.book.errors.confirmFailed'));
      setResult(data);
      setStep('confirm');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('storage.book.errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  const stepLabels: { key: Step; label: string }[] = [
    { key: 'unit', label: t('storage.book.steps.unit') },
    { key: 'contact', label: t('storage.book.steps.contact') },
    { key: 'confirm', label: t('storage.book.steps.confirm') },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <TrackMarketplaceEvent listingId={searchParams.listingId} eventType="booking_click" metadata={{ slug: params.slug }} />
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">SiteLager</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">{t('storage.book.nav.signIn')}</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="max-w-xl">
        <Link href={`/storage/${params.slug}`} className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">
          {t('storage.book.backToSite')}
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
              <h2 className="text-lg font-semibold text-slate-900">{t('storage.book.unit.title')}</h2>

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
                <p className="text-slate-500 text-sm">{t('storage.book.unit.noUnitTypes')}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('storage.book.unit.moveInDateLabel')}</label>
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
                {loading ? t('storage.book.unit.checking') : t('storage.book.unit.continue')}
              </button>
            </form>
          )}

          {step === 'contact' && (
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">{t('storage.book.contact.title')}</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('storage.book.contact.nameLabel')}</label>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder={t('storage.book.contact.namePlaceholder')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('storage.book.contact.emailLabel')}</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder={t('storage.book.contact.emailPlaceholder')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('storage.book.contact.phoneLabel')}</label>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder={t('storage.book.contact.phonePlaceholder')}
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
                <span className="text-sm text-slate-600">{t('storage.book.contact.marketingConsent')}</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('unit')}
                  className="flex-1 border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                >
                  {t('storage.book.contact.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {loading ? t('storage.book.contact.confirming') : t('storage.book.contact.confirmBooking')}
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
              <h2 className="text-xl font-semibold text-slate-900">{t('storage.book.confirm.title')}</h2>
              <p className="text-slate-500 text-sm">
                {t('storage.book.confirm.emailSentPrefix')} <strong>{contact.email}</strong>{t('storage.book.confirm.emailSentSuffix')}
              </p>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('storage.book.confirm.reservationId')}</span>
                  <span className="font-mono text-xs text-slate-700">{result.reservationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('storage.book.confirm.status')}</span>
                  <span className="text-slate-700 capitalize">{result.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('storage.book.confirm.reservedUntil')}</span>
                  <span className="text-slate-700">{new Date(result.expiresAt).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                {result.nextStep === 'operator_approval'
                  ? 'Der Betreiber prüft Ihre Anfrage und bestätigt die Verfügbarkeit.'
                  : 'Der nächste Schritt ist Vertrag/Unterschrift und Zahlung, sobald der Betreiber die Buchung vorbereitet hat.'}
              </p>
              <Link
                href={`/storage/${params.slug}`}
                className="inline-block mt-2 text-blue-600 text-sm hover:underline"
              >
                {t('storage.book.confirm.backToSite')}
              </Link>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
