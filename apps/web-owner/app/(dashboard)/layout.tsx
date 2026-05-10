import Link from 'next/link';
import { getLocale } from '../../lib/locale';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

const navEn = [
  { label: 'Portfolio', href: '/', icon: '📊' }, { label: 'Locations', href: '/sites', icon: '📍' },
  { label: 'Pricing', href: '/pricing', icon: '💰' }, { label: 'Users', href: '/users', icon: '👥' },
  { label: 'DATEV Export', href: '/exports', icon: '📤' }, { label: 'Audit Log', href: '/audit', icon: '🔍' },
];
const navDe = [
  { label: 'Portfolio', href: '/', icon: '📊' }, { label: 'Standorte', href: '/sites', icon: '📍' },
  { label: 'Preise', href: '/pricing', icon: '💰' }, { label: 'Nutzer', href: '/users', icon: '👥' },
  { label: 'DATEV-Export', href: '/exports', icon: '📤' }, { label: 'Audit-Log', href: '/audit', icon: '🔍' },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const nav = locale === 'de' ? navDe : navEn;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-white p-4 flex flex-col shadow-sm">
        <div className="mb-1 flex items-center gap-2 px-2 py-3">
          <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">CO</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Container OS</p>
            <p className="text-xs text-gray-400">{locale === 'de' ? 'Eigentümer' : 'Owner view'}</p>
          </div>
        </div>
        <div className="my-3 border-t border-gray-100" />
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium">
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-100">
          <LanguageSwitcher current={locale} />
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">{locale === 'de' ? 'Portfolio-Übersicht' : 'Portfolio overview'}</span>
          <span className="text-xs text-gray-400">{locale === 'de' ? '2 Standorte aktiv' : '2 sites active'}</span>
        </header>
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
