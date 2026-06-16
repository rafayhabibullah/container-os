'use client';

import { FormEvent, useState } from 'react';

type Props =
  | { type: 'retry-job'; jobId: string }
  | { type: 'support-access'; organisationId: string }
  | { type: 'feature-flag' };

export default function PlatformAdminActions(props: Props) {
  const [loading, setLoading] = useState(false);

  async function submit(path: string, body?: object) {
    setLoading(true);
    const res = await fetch('/api/platform-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, body }),
    });
    if (!res.ok) alert('Platform action failed');
    window.location.reload();
  }

  if (props.type === 'retry-job') {
    return <button disabled={loading} onClick={() => submit(`/platform/v1/jobs/${props.jobId}/retry`)}>Retry</button>;
  }

  if (props.type === 'support-access') {
    return (
      <button
        disabled={loading}
        onClick={() => submit('/platform/v1/support-access', {
          actorId: 'platform-admin',
          organisationId: props.organisationId,
          reason: 'support',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })}
      >
        1h access
      </button>
    );
  }

  function onFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const key = String(form.get('key') ?? '');
    const enabled = form.get('enabled') === 'on';
    if (!key) return;
    void submit(`/platform/v1/feature-flags/${encodeURIComponent(key)}`, { enabled });
  }

  return (
    <form onSubmit={onFlag} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input name="key" placeholder="flag.key" style={{ padding: 8, border: '1px solid #cbd5e1', borderRadius: 6 }} />
      <label style={{ fontSize: 13 }}><input name="enabled" type="checkbox" /> enabled</label>
      <button disabled={loading}>Save</button>
    </form>
  );
}
