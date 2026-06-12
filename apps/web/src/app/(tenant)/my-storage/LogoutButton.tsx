'use client';

import { useT } from '@/lib/i18n';

export default function LogoutButton() {
  const t = useT();
  return (
    <form action="/api/auth/tenant-logout" method="POST">
      <button
        type="submit"
        style={{
          background: 'none',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '7px 14px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#64748b',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {t('myStorage.logout')}
      </button>
    </form>
  );
}
