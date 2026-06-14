'use client';

import { useState, type ReactNode } from 'react';

export default function ReportsTabs({
  labels,
  overview,
  financial,
  operations,
  growth,
}: {
  labels: { overview: string; financial: string; operations: string; growth: string };
  overview: ReactNode;
  financial: ReactNode;
  operations: ReactNode;
  growth: ReactNode;
}) {
  const [tab, setTab] = useState<'overview' | 'financial' | 'operations' | 'growth'>('overview');

  const tabs: { key: typeof tab; label: string; content: ReactNode }[] = [
    { key: 'overview', label: labels.overview, content: overview },
    { key: 'financial', label: labels.financial, content: financial },
    { key: 'operations', label: labels.operations, content: operations },
    { key: 'growth', label: labels.growth, content: growth },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: tab === tb.key ? '#0f172a' : '#94a3b8',
              borderBottom: tab === tb.key ? '2px solid #0f172a' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tabs.find((tb) => tb.key === tab)?.content}
    </div>
  );
}
