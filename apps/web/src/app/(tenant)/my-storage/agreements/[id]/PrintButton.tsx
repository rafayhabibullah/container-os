'use client';

import { useT } from '@/lib/i18n';

export default function PrintButton() {
  const t = useT();
  return (
    <button
      style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontSize: '13px', fontWeight: 600, padding: '10px 20px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      onClick={() => window.print()}
    >
      {t('myStorage.printButton')}
    </button>
  );
}
