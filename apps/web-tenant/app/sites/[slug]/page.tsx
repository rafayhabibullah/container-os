import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function getSiteBySlug(slug: string) {
  const res = await fetch(`${API_URL}/public/v1/sites`, { cache: 'no-store' });
  if (!res.ok) return null;
  const sites: any[] = await res.json();
  return sites.find((s) => s.slug === slug) ?? null;
}

async function getAvailability(slug: string) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const res = await fetch(`${API_URL}/public/v1/sites/${slug}/availability?startDate=${today}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

const UNIT_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  '10ft': { label: '10-Fuß Container', icon: '📦', desc: '7 m² · Drive-up · Wetterfest' },
  '20ft': { label: '20-Fuß Container', icon: '🚢', desc: '14 m² · Drive-up · Wetterfest' },
  '40ft': { label: '40-Fuß Container', icon: '🏭', desc: '28 m² · Drive-up · Für Gewerbetreibende' },
  'small': { label: 'Lagerbox Klein', icon: '🗃️', desc: '5 m² · Klimatisiert · Innenbereich' },
  'medium': { label: 'Lagerbox Mittel', icon: '📁', desc: '10 m² · Klimatisiert · Innenbereich' },
};

const PRICES: Record<string, number> = {
  '10ft': 6900, '20ft': 11900, '40ft': 18900, 'small': 4900, 'medium': 7900,
};

function getUnitKey(unitTypeId: string) {
  for (const key of Object.keys(UNIT_LABELS)) {
    if (unitTypeId.includes(key)) return key;
  }
  return null;
}

function fmt(minor: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function SitePage({ params }: { params: { slug: string } }) {
  const [site, availability] = await Promise.all([
    getSiteBySlug(params.slug),
    getAvailability(params.slug),
  ]);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-600">Standorte</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700 font-medium">{site?.name ?? params.slug}</span>
      </nav>

      {/* Site header */}
      {site && (
        <div className="mb-8 rounded-xl bg-blue-600 px-6 py-6 text-white">
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <p className="mt-1 text-blue-100 text-sm">{site.address?.street}, {site.address?.city}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['Mo–Fr: 06–22 Uhr', 'Sa: 07–20 Uhr', 'So: 08–18 Uhr']).map((h) => (
              <span key={h} className="rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium">{h}</span>
            ))}
          </div>
        </div>
      )}

      {/* Unit grid */}
      <h2 className="mb-4 text-base font-semibold text-gray-900">Verfügbare Einheiten</h2>

      {availability.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
          Keine Verfügbarkeit gefunden.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availability.map((item: any) => {
            const key = getUnitKey(item.unitTypeId);
            const meta = key ? UNIT_LABELS[key] : { label: item.unitTypeId, icon: '📦', desc: '' };
            const price = key ? PRICES[key] : 0;
            const available = item.availableCount > 0;

            return (
              <div key={item.unitTypeId} className={`rounded-xl border bg-white p-5 ${available ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'}`}>
                <div className="mb-3 flex items-start justify-between">
                  <span className="text-2xl">{meta.icon}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {available ? `${item.availableCount} frei` : 'Ausgebucht'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{meta.label}</h3>
                <p className="mt-0.5 text-xs text-gray-400">{meta.desc}</p>
                <div className="mt-3 flex items-baseline justify-between border-t border-gray-100 pt-3">
                  {price > 0 ? (
                    <div>
                      <span className="text-xs text-gray-400">ab </span>
                      <span className="font-semibold text-gray-900">{fmt(price)}</span>
                      <span className="text-xs text-gray-400"> /Mo.</span>
                    </div>
                  ) : <span />}
                  {available ? (
                    <Link
                      href={`/sites/${params.slug}/checkout?unitTypeId=${item.unitTypeId}`}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Buchen →
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">Warteliste</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
