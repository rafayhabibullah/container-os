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
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useT } from '@/lib/i18n';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BrandLogo } from '@/components/brand-logo';

const NAV_ITEMS: { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; wip?: boolean }[] = [
  { href: '/dashboard', labelKey: 'dashboard.nav.dashboard', icon: LayoutGrid },
  { href: '/sites', labelKey: 'dashboard.nav.sites', icon: Building2 },
  { href: '/listings', labelKey: 'dashboard.nav.listings', icon: Globe },
  { href: '/reservations', labelKey: 'dashboard.nav.reservations', icon: CalendarCheck },
  { href: '/tenants', labelKey: 'dashboard.nav.customers', icon: Users },
  { href: '/agreements', labelKey: 'dashboard.nav.agreements', icon: BookOpen },
  { href: '/invoices', labelKey: 'dashboard.nav.invoices', icon: FileText },
  { href: '/payments', labelKey: 'dashboard.nav.payments', icon: CreditCard },
  { href: '/tasks', labelKey: 'dashboard.nav.tasks', icon: ClipboardList },
  { href: '/inspections', labelKey: 'dashboard.nav.inspections', icon: ClipboardCheck },
  { href: '/incidents', labelKey: 'dashboard.nav.incidents', icon: AlertTriangle },
  { href: '/reports', labelKey: 'dashboard.nav.reports', icon: BarChart2 },
  { href: '/team', labelKey: 'dashboard.nav.team', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(true);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r border-slate-200 shrink-0 transition-all duration-200',
        open ? 'w-[220px]' : 'w-[52px]',
      )}
    >
      {/* Toggle */}
      <div className="flex items-center h-[52px] px-3 border-b border-slate-100 shrink-0">
        {open && <BrandLogo href="/dashboard" compact className="mr-auto" />}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          {open ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-1.5 flex-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon, wip }) => {
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
              {open && (
                <span
                  className={cn(
                    'text-sm whitespace-nowrap',
                    active ? 'font-semibold' : 'font-medium',
                    wip && 'line-through opacity-50',
                  )}
                >
                  {t(labelKey)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Locale switcher */}
      {open && (
        <div className="px-1.5 pb-1.5 shrink-0">
          <LocaleSwitcher />
        </div>
      )}

      {/* Settings + Logout pinned at bottom */}
      <div className="p-1.5 shrink-0 border-t border-slate-100 flex flex-col gap-0.5">
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
          {open && <span className="text-sm font-medium">{t('dashboard.nav.settings')}</span>}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {open && <span className="text-sm font-medium">{t('dashboard.nav.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
