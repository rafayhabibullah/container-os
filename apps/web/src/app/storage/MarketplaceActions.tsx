'use client';

import { useEffect, useState } from 'react';
import { Bell, Send, Star } from 'lucide-react';
import { backendApi } from '@/lib/backend-url';

export function SavedSearchForm({ city, query, filters }: { city?: string; query?: string; filters?: Record<string, unknown> }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function submit(formData: FormData) {
    const nextEmail = String(formData.get('email') ?? '');
    setState('saving');
    const res = await fetch(backendApi('/public/v1/saved-searches'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: nextEmail, city, query, filters }),
    });
    if (res.ok) {
      setEmail('');
      setState('saved');
    } else {
      setState('error');
    }
  }

  return (
    <form action={submit} className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-blue-600" />
        <p className="font-semibold text-slate-950 text-sm">Suchauftrag speichern</p>
      </div>
      <p className="text-xs text-slate-500 mt-2">Wir merken uns diese Suche und melden neue passende Angebote.</p>
      <div className="mt-3 flex gap-2">
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="E-Mail"
          className="min-w-0 flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <button disabled={state === 'saving'} className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center disabled:opacity-60" aria-label="Suchauftrag speichern">
          <Send className="w-4 h-4" />
        </button>
      </div>
      {state === 'saved' && <p className="text-xs text-green-700 mt-2">Gespeichert.</p>}
      {state === 'error' && <p className="text-xs text-red-600 mt-2">Speichern fehlgeschlagen.</p>}
    </form>
  );
}

export function ReviewForm({ listingId }: { listingId: string }) {
  const [rating, setRating] = useState(5);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function submit(formData: FormData) {
    setState('saving');
    const res = await fetch(backendApi('/public/v1/marketplace/reviews'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId,
        rating,
        title: formData.get('title'),
        body: formData.get('body'),
        reviewerName: formData.get('reviewerName'),
        reviewerEmail: formData.get('reviewerEmail'),
      }),
    });
    setState(res.ok ? 'saved' : 'error');
  }

  return (
    <form action={submit} className="mt-4 border border-slate-200 rounded-lg p-4">
      <p className="font-semibold text-slate-950 text-sm">Erfahrung teilen</p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" onClick={() => setRating(value)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100" aria-label={`${value} Sterne`}>
            <Star className={`w-4 h-4 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
          </button>
        ))}
      </div>
      <input name="title" placeholder="Kurzfassung" className="mt-3 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      <textarea name="body" placeholder="Was war gut?" className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-24" />
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input name="reviewerName" placeholder="Name" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        <input name="reviewerEmail" type="email" placeholder="E-Mail" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <button disabled={state === 'saving'} className="mt-3 bg-slate-950 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">Bewertung senden</button>
      {state === 'saved' && <p className="text-xs text-green-700 mt-2">Danke. Die Bewertung wurde gespeichert.</p>}
      {state === 'error' && <p className="text-xs text-red-600 mt-2">Bewertung konnte nicht gespeichert werden.</p>}
    </form>
  );
}

export function TrackMarketplaceEvent({ listingId, eventType, metadata }: { listingId?: string; eventType: string; metadata?: Record<string, unknown> }) {
  useEffect(() => {
    fetch(backendApi('/public/v1/marketplace/events'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, eventType, metadata }),
    }).catch(() => undefined);
  }, [eventType, listingId, metadata]);
  return null;
}
