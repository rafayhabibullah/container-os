import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle, Button } from '@container-os/ui';

async function getAvailability(slug: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api'}/public/v1/sites/${slug}/availability?startDate=${today}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export default async function SitePage({ params }: { params: { slug: string } }) {
  const availability = await getAvailability(params.slug);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Verfügbare Einheiten</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availability.map((item: any) => (
          <Card key={item.unitTypeId}>
            <CardHeader>
              <CardTitle className="text-base">{item.unitTypeId}</CardTitle>
              <Badge variant={item.availableCount > 0 ? 'success' : 'destructive'}>
                {item.availableCount > 0 ? `${item.availableCount} verfügbar` : 'Ausgebucht'}
              </Badge>
            </CardHeader>
            <CardContent>
              {item.availableCount > 0 && (
                <Link href={`/sites/${params.slug}/checkout?unitTypeId=${item.unitTypeId}`}>
                  <Button className="w-full mt-2">Jetzt buchen</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
