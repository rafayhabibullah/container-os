'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Building2,
  FileText,
  Users,
  BarChart2,
  CalendarCheck,
  ClipboardList,
  AlertTriangle,
  BookOpen,
  Settings,
  Globe,
  CreditCard,
  ClipboardCheck,
  FolderOpen,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sites', label: 'Sites', icon: Building2 },
  { href: '/listings', label: 'Listings', icon: Globe },
  { href: '/reservations', label: 'Reservations', icon: CalendarCheck },
  { href: '/bookings', label: 'Bookings', icon: FileCheck },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/agreements', label: 'Agreements', icon: BookOpen },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/billing', label: 'SiteLager Billing', icon: Receipt },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="group/sidebar flex flex-col bg-white border-r border-slate-200 w-[52px] hover:w-[200px] transition-all duration-200 ease-in-out overflow-hidden shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-[56px] shrink-0">
        <div className="w-[28px] h-[28px] shrink-0 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white text-[11px] font-bold leading-none">S</span>
        </div>
        <span className="text-slate-900 font-bold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
          SiteLager
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-1.5 flex-1 overflow-hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg border transition-colors',
                active
                  ? 'bg-blue-50 border-blue-100 text-blue-700'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span
                className={cn(
                  'text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings pinned at bottom */}
      <div className="p-1.5 shrink-0 border-t border-slate-100">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-lg border transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-blue-50 border-blue-100 text-blue-700'
              : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
            Settings
          </span>
        </Link>
      </div>
    </aside>
  );
}
