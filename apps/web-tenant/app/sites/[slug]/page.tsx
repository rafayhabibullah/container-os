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

const UNIT_META: Record<string, { label: string; icon: string; desc: string }> = {
  '10ft': { label: '10 ft Container', icon: '📦', desc: '7 m² · Drive-up · Weatherproof' },
  '20ft': { label: '20 ft Container', icon: '🚢', desc: '14 m² · Drive-up · Weatherproof' },
  '40ft': { label: '40 ft Container', icon: '🏭', desc: '28 m² · Drive-up · Commercial use' },
  'small': { label: 'Small Storage Box', icon: '🗃️', desc: '5 m² · Climate-controlled · Indoor' },
  'medium': { label: 'Medium Storage Box', icon: '📁', desc: '10 m² · Climate-controlled · Indoor' },
};

const PRICES: Record<string, number> = {
  '10ft': 6900, '20ft': 11900, '40ft': 18900, 'small': 4900, 'medium': 7900,
};

function getKey(unitTypeId: string) {
  return Object.keys(UNIT_META).find((k) => unitTypeId.includes(k)) ?? null;
}

function fmt(minor: number) {
  return new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function SitePage({ params }: { params: { slug: string } }) {
  const [site, availability] = await Promise.all([getSiteBySlug(params.slug), getAvailability(params.slug)]);

  return (
    <div>
      <nav className="mb-6 text-sm text-gray-400">
        <Link href="/" className="hover:text-gray-600">Locations</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-700 font-medium">{site?.name ?? params.slug}</span>
      </nav>

      {site && (
        <div className="mb-8 rounded-xl bg-blue-600 px-6 py-6 text-white">
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <p className="mt-1 text-blue-100 text-sm">{site.address?.street}, {site.address?.city}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {['Mon–Fri: 6am–10pm', 'Sat: 7am–8pm', 'Sun: 8am–6pm'].map((h) => (
              <span key={h} className="rounded-full bg-blue-500 px-2.5 py-0.5 font-medium">{h}</span>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-4 text-base font-semibold text-gray-900">Available units</h2>

      {availability.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">No units found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availability.map((item: any) => {
            const key = getKey(item.unitTypeId);
            const meta = key ? UNIT_META[key] : { label: item.unitTypeId, icon: '📦', desc: '' };
            const price = key ? PRICES[key] : 0;
            const avail = item.availableCount > 0;

            return (
              <div key={item.unitTypeId} className={`rounded-xl border bg-white p-5 ${avail ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60'}`}>
                <div className="mb-3 flex items-start justify-between">
                  <span className="text-2xl">{meta.icon}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${avail ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {avail ? `${item.availableCount} available` : 'Sold out'}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{meta.label}</h3>
                <p className="mt-0.5 text-xs text-gray-400">{meta.desc}</p>
                <div className="mt-3 flex items-baseline justify-between border-t border-gray-100 pt-3">
                  {price > 0 ? (
                    <div>
                      <span className="text-xs text-gray-400">from </span>
                      <span className="font-semibold text-gray-900">{fmt(price)}</span>
                      <span className="text-xs text-gray-400"> /mo</span>
                    </div>
                  ) : <span />}
                  {avail ? (
                    <Link href={`/sites/${params.slug}/checkout?unitTypeId=${item.unitTypeId}`} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                      Book →
                    </Link>
                  ) : (
                    <span className="text-xs text-gray-400">Waitlist</span>
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
