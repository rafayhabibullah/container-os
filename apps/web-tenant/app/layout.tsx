import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Container OS — Self-Storage', description: 'Sicherer Lagerraum online buchen' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="border-b bg-white px-6 py-4">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <span className="text-lg font-semibold text-blue-700">Container OS</span>
            <a href="/portal" className="text-sm text-gray-600 hover:text-gray-900">Mein Konto</a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
