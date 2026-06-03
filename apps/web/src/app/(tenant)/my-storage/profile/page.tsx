import { requireTenantAuth } from '@/lib/auth';
import { serverTenantFetch } from '@/lib/server-api';
import Link from 'next/link';
import ProfileForm from './ProfileForm';

export interface TenantProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

export default async function ProfilePage() {
  await requireTenantAuth();
  const profile = await serverTenantFetch<TenantProfile>('/v1/tenant/profile').catch(() => null);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`@media (max-width: 640px) { .ms-wrap { padding: 20px 16px !important; } }`}</style>
      <div className="ms-wrap" style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <Link href="/my-storage" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            &larr; My Storage
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Profile</h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 28px' }}>Update your name and contact information</p>

          {profile ? (
            <ProfileForm profile={profile} />
          ) : (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '13px' }}>
              Failed to load profile. Please try refreshing the page.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
