'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CreditCard, KeyRound, WalletCards, Webhook } from 'lucide-react';
import { useT } from '@/lib/i18n';

const OWNER_TABS = [
  { href: '/settings', labelKey: 'dashboard.settings.tabs.general', icon: Building2, exact: true },
  { href: '/settings/billing', labelKey: 'dashboard.settings.tabs.billing', icon: CreditCard },
  { href: '/settings/payments', labelKey: 'dashboard.settings.tabs.payments', icon: WalletCards },
  { href: '/settings/api-keys', labelKey: 'dashboard.settings.tabs.apiKeys', icon: KeyRound },
  { href: '/settings/webhooks', labelKey: 'dashboard.settings.tabs.webhooks', icon: Webhook },
];

export function SettingsTabs({ role }: { role: string }) {
  const pathname = usePathname();
  const t = useT();
  const tabs = role === 'billing_admin' ? OWNER_TABS.slice(1, 3) : OWNER_TABS;

  return (
    <nav aria-label={t('dashboard.settings.tabs.label')} className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map(({ href, labelKey, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              active
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
