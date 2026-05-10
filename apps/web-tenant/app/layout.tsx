import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Container OS — Secure Storage',
  description: 'Container units and storage boxes — online booking, drive-up access, 24/7.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-3">
            <a href="/" className="flex items-center gap-2 text-blue-700 hover:text-blue-800">
              <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">CO</div>
              <span className="text-base font-semibold">Container OS</span>
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/" className="text-gray-500 hover:text-gray-900 transition-colors">Locations</a>
              <a href="/portal/dashboard" className="rounded-md bg-blue-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                My Account
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        <footer className="mt-16 border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-400">
          © 2026 Container OS · GDPR Compliant · Privacy · Imprint
        </footer>
      </body>
    </html>
  );
}
