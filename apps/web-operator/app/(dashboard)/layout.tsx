import Link from 'next/link';

const nav = [
  { label: 'Heute', href: '/' },
  { label: 'Leads', href: '/leads' },
  { label: 'Reservierungen', href: '/reservations' },
  { label: 'Verträge', href: '/agreements' },
  { label: 'Rechnungen', href: '/billing' },
  { label: 'Inspektionen', href: '/inspections' },
  { label: 'Vorfälle', href: '/incidents' },
  { label: 'Einheiten', href: '/units' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4 flex flex-col">
        <div className="text-sm font-semibold text-blue-700 mb-6">Operator</div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-200 transition-colors">{item.label}</Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
