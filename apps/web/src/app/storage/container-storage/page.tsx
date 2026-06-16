import Link from 'next/link';

export const metadata = {
  title: 'Container mieten und vergleichen | SiteLager',
  description: 'Container-Lager in Deutschland finden, Preise vergleichen und online reservieren.',
};

export default function ContainerStorageLandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="max-w-5xl mx-auto px-5 py-14">
        <Link href="/storage" className="text-sm text-blue-600 hover:underline">Alle Lagerangebote</Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">Container mieten</h1>
        <p className="mt-3 text-slate-600 max-w-2xl">Vergleichen Sie verfügbare Lagercontainer nach Standort, Größe, Preis und Zugang. Viele Angebote sind direkt reservierbar.</p>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {['Drive-up Zugang', 'Flexible Laufzeiten', 'Sofort verfügbare Einheiten'].map((item) => (
            <div key={item} className="border border-slate-200 rounded-lg p-5 font-semibold text-slate-800">{item}</div>
          ))}
        </div>
        <Link href="/storage?feature=drive-up" className="inline-block mt-8 bg-blue-600 text-white font-semibold rounded-lg px-5 py-3">Container-Angebote ansehen</Link>
      </section>
    </main>
  );
}
