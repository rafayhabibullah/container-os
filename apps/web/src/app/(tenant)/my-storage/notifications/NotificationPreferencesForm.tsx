'use client';

import { useState } from 'react';
import { updatePreference } from './actions';
import { useT } from '@/lib/i18n';

export interface NotificationPreference {
  eventType: string;
  channel: 'email' | 'sms' | 'push';
  enabled: boolean;
}

const EVENT_TYPES = ['invoice.overdue', 'invoice.paid', 'agreement.activated', 'access.credential.issued'] as const;
const CHANNELS = ['email', 'sms', 'push'] as const;

export default function NotificationPreferencesForm({ preferences }: { preferences: NotificationPreference[] }) {
  const t = useT();
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const p of preferences) map[`${p.eventType}:${p.channel}`] = p.enabled;
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function toggle(eventType: string, channel: string) {
    const key = `${eventType}:${channel}`;
    const next = !state[key];
    setSaving(key);
    setError('');
    try {
      await updatePreference({ eventType, channel, enabled: next });
      setState((s) => ({ ...s, [key]: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('myStorage.notifications.errorGeneric'));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '24px' }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569', padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
              {t('myStorage.notifications.eventColumn')}
            </th>
            {CHANNELS.map((channel) => (
              <th key={channel} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#475569', padding: '8px 4px', borderBottom: '1px solid #f1f5f9' }}>
                {t(`myStorage.notifications.channels.${channel}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EVENT_TYPES.map((eventType) => (
            <tr key={eventType}>
              <td style={{ fontSize: '13px', color: '#0f172a', padding: '12px 4px', borderBottom: '1px solid #f8fafc' }}>
                {t(`myStorage.notifications.events.${eventType.replace(/\./g, '_')}`)}
              </td>
              {CHANNELS.map((channel) => {
                const key = `${eventType}:${channel}`;
                const enabled = state[key] ?? true;
                const isSaving = saving === key;
                return (
                  <td key={channel} style={{ textAlign: 'center', padding: '12px 4px', borderBottom: '1px solid #f8fafc' }}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      disabled={isSaving}
                      onClick={() => toggle(eventType, channel)}
                      style={{
                        width: '36px',
                        height: '20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: enabled ? '#16a34a' : '#cbd5e1',
                        position: 'relative',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        opacity: isSaving ? 0.6 : 1,
                        transition: 'background 0.15s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: enabled ? '18px' : '2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          transition: 'left 0.15s',
                        }}
                      />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
