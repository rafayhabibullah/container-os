import Link from 'next/link';

const nav = [{ label: 'Portfolio', href: '/' }, { label: 'Standorte', href: '/sites' }, { label: 'Preise', href: '/pricing' }, { label: 'Nutzer', href: '/users' }, { label: 'DATEV-Export', href: '/exports' }, { label: 'Audit-Log', href: '/audit' }];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4 flex flex-col">
        <div className="text-sm font-semibold text-blue-700 mb-6">Owner</div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => <Link key={item.href} href={item.href} className="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-200">{item.label}</Link>)}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
