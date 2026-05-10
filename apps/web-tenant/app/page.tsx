import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

async function getSites() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api'}/public/v1/sites`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default async function HomePage() {
  const sites = await getSites();
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Sicherer Lagerraum in Ihrer Nähe</h1>
      <p className="text-gray-600 mb-8">Buchen Sie online — Zugang rund um die Uhr, flexible Laufzeiten.</p>
      {sites.length === 0 ? (
        <p className="text-gray-500">Keine Standorte verfügbar.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sites.map((site: any) => (
            <Link key={site.id} href={`/sites/${site.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader><CardTitle>{site.name}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-blue-600 font-medium">Verfügbarkeit prüfen →</p></CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
