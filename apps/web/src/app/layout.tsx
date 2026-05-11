import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SiteLager',
  description: 'The operating system for modern storage sites.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
