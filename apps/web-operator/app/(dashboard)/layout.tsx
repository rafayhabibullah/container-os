import Link from 'next/link';
import { getLocale } from '../../lib/locale';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

const navEn = [
  { label: 'Today', href: '/' }, { label: 'Leads', href: '/leads' },
  { label: 'Reservations', href: '/reservations' }, { label: 'Agreements', href: '/agreements' },
  { label: 'Invoices', href: '/billing' }, { label: 'Inspections', href: '/inspections' },
  { label: 'Incidents', href: '/incidents' }, { label: 'Units', href: '/units' },
];
const navDe = [
  { label: 'Heute', href: '/' }, { label: 'Leads', href: '/leads' },
  { label: 'Reservierungen', href: '/reservations' }, { label: 'Verträge', href: '/agreements' },
  { label: 'Rechnungen', href: '/billing' }, { label: 'Inspektionen', href: '/inspections' },
  { label: 'Vorfälle', href: '/incidents' }, { label: 'Einheiten', href: '/units' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const nav = locale === 'de' ? navDe : navEn;

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-white p-4 flex flex-col shadow-sm">
        <div className="mb-1 flex items-center gap-2 px-2 py-3">
          <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">CO</div>
          <span className="text-sm font-semibold text-gray-900">Operator</span>
        </div>
        <div className="my-3 border-t border-gray-100" />
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-100">
          <LanguageSwitcher current={locale} />
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">{locale === 'de' ? 'Operator-Dashboard' : 'Operator Dashboard'}</span>
          <span className="text-xs text-gray-400">{locale === 'de' ? 'Alle Standorte' : 'All sites'}</span>
        </header>
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
