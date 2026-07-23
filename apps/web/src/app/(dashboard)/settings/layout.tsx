import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getT } from '@/lib/get-locale';
import { SettingsTabs } from './SettingsTabs';

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();
  if (!['owner', 'billing_admin'].includes(user.role)) redirect('/dashboard');
  const t = getT();

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-7 font-sans sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold text-slate-900">{t('dashboard.settings.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('dashboard.settings.subtitle')}</p>
        </div>
        <SettingsTabs role={user.role} />
        {children}
      </div>
    </div>
  );
}
