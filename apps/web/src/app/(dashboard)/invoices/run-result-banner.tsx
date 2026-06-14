'use client';

import { useState } from 'react';

export function RunResultBanner({
  message,
  isError,
}: {
  message: string;
  isError: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        fontSize: '13px',
        fontWeight: 600,
        color: isError ? '#dc2626' : '#15803d',
        background: isError ? '#fef2f2' : '#f0fdf4',
        border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
