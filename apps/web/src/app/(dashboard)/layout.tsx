import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { requireAuth } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  if (user.type === 'tenant') redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
    </div>
  );
}
