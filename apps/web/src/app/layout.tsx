import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n';
import { getLocale } from '@/lib/get-locale';

export const metadata: Metadata = {
  title: 'SiteLager',
  description: 'The operating system for modern storage sites.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale}>
      <body className="bg-slate-50 text-slate-900 antialiased">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
