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
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import React from 'react';

const NAV_ITEMS: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; wip?: boolean }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sites', label: 'Sites', icon: Building2 },
  { href: '/listings', label: 'Listings', icon: Globe },
  { href: '/reservations', label: 'Reservations', icon: CalendarCheck },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/agreements', label: 'Agreements', icon: BookOpen },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/billing', label: 'SiteLager Billing', icon: Receipt },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r border-slate-200 shrink-0 transition-all duration-200',
        open ? 'w-[220px]' : 'w-[52px]',
      )}
    >
      {/* Toggle */}
      <div className="flex items-center h-[52px] px-3 border-b border-slate-100 shrink-0">
        {open && (
          <span className="flex-1 text-sm font-bold text-slate-800 truncate">SiteLager</span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          {open ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-1.5 flex-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon, wip }) => {
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
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

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
          {open && <span className="text-sm font-medium">Settings</span>}
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {open && <span className="text-sm font-medium">Log out</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
