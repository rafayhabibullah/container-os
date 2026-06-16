import Link from 'next/link';

export const metadata = {
  title: 'Self Storage vergleichen | SiteLager',
  description: 'Self-Storage-Flächen nach Stadt, Größe, Preis und Verfügbarkeit vergleichen.',
};

export default function SelfStorageLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-5xl mx-auto px-5 py-14">
        <Link href="/storage" className="text-sm text-blue-600 hover:underline">Alle Lagerangebote</Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">Self Storage finden</h1>
        <p className="mt-3 text-slate-600 max-w-2xl">Finden Sie passende Lagerflächen für Möbel, Akten, Waren oder private Gegenstände. Transparent, lokal und schnell reservierbar.</p>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {['Private Lagerflächen', 'Gewerbliche Nutzung', 'Flexible Größen'].map((item) => (
            <div key={item} className="border border-slate-200 rounded-lg p-5 font-semibold text-slate-800">{item}</div>
          ))}
        </div>
        <Link href="/storage?mode=instant_booking" className="inline-block mt-8 bg-blue-600 text-white font-semibold rounded-lg px-5 py-3">Self-Storage-Angebote ansehen</Link>
      </section>
    </main>
  );
}
