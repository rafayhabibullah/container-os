'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Site, Member } from './page';

interface Props {
  type: 'create' | 'update';
  taskId?: string;
  currentStatus?: string;
  sites?: Site[];
  members?: Member[];
}

const NEXT_STATUSES: Record<string, string[]> = {
  open:        ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['completed',   'blocked', 'cancelled'],
  blocked:     ['in_progress', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Start',
  completed:   'Complete',
  blocked:     'Block',
  cancelled:   'Cancel',
};

const TASK_TYPES = [
  { value: 'move_in',         label: 'Move-in'         },
  { value: 'move_out',        label: 'Move-out'        },
  { value: 'inspect_unit',    label: 'Inspect unit'    },
  { value: 'clean_unit',      label: 'Clean unit'      },
  { value: 'repair_unit',     label: 'Repair unit'     },
  { value: 'verify_document', label: 'Verify document' },
  { value: 'approve_booking', label: 'Approve booking' },
  { value: 'call_tenant',     label: 'Call tenant'     },
  { value: 'collect_payment', label: 'Collect payment' },
  { value: 'assign_access',   label: 'Assign access'   },
  { value: 'upload_contract', label: 'Upload contract' },
  { value: 'other',           label: 'Other'           },
];

const TASK_PRIORITIES = [
  { value: 'low',    label: 'Low'    },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High'   },
  { value: 'urgent', label: 'Urgent' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

export default function TaskActions({ type, taskId, currentStatus, sites = [], members = [] }: Props) {
  const router = useRouter();
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowForm(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showForm]);

  async function doAction(url: string, method: string, body?: object) {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body:    body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.refresh();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  /* ── Create modal ────────────────────────────────────────────────────── */
  if (type === 'create') {
    const modal = mounted && showForm ? createPortal(
      <>
        <style>{`
          @keyframes task-backdrop-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes task-modal-in {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0)    scale(1);    }
          }
          .task-modal-backdrop { animation: task-backdrop-in 0.18s ease both; }
          .task-modal-card     { animation: task-modal-in    0.22s ease both; }
          .task-modal-input:focus {
            border-color: #94a3b8 !important;
            box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important;
          }
        `}</style>

        <div
          className="task-modal-backdrop"
          onClick={() => setShowForm(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="task-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px 16px',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  New task
                </p>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>
                  Assign a task to one of your sites
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '6px', width: '28px', height: '28px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                await doAction('/api/tasks', 'POST', {
                  siteId:     form.get('siteId'),
                  title:      form.get('title'),
                  type:       form.get('type') || undefined,
                  priority:   form.get('priority') || 'normal',
                  notes:      form.get('notes') || undefined,
                  assigneeId: form.get('assigneeId') || undefined,
                  unitId:     form.get('unitId') || undefined,
                  tenantId:   form.get('tenantId') || undefined,
                  bookingId:  form.get('bookingId') || undefined,
                  dueAt:      form.get('dueAt') || undefined,
                });
              }}
              style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label style={labelStyle}>SITE</label>
                <select name="siteId" required className="task-modal-input" style={inputStyle}>
                  <option value="">Select a site…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>TASK TITLE</label>
                <input
                  name="title"
                  placeholder="e.g. Inspect unit 12, fix gate lock…"
                  required
                  className="task-modal-input"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>TYPE <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
                  <select name="type" className="task-modal-input" style={inputStyle}>
                    <option value="">— none —</option>
                    {TASK_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>PRIORITY</label>
                  <select name="priority" defaultValue="normal" className="task-modal-input" style={inputStyle}>
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {members.length > 0 && (
                <div>
                  <label style={labelStyle}>ASSIGNEE <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
                  <select name="assigneeId" className="task-modal-input" style={inputStyle}>
                    <option value="">— unassigned —</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.user.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={labelStyle}>NOTES <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  name="notes"
                  placeholder="Additional details…"
                  rows={2}
                  className="task-modal-input"
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>UNIT ID <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
                  <input name="unitId" placeholder="unit ID…" className="task-modal-input" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>TENANT ID <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
                  <input name="tenantId" placeholder="tenant ID…" className="task-modal-input" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>BOOKING ID <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
                  <input name="bookingId" placeholder="booking ID…" className="task-modal-input" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>DUE DATE <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
                <input
                  name="dueAt"
                  type="date"
                  className="task-modal-input"
                  style={inputStyle}
                />
              </div>

              {error && (
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px', color: '#dc2626',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: '6px', padding: '9px 12px', margin: 0,
                }}>
                  {error}
                </p>
              )}

              <div style={{
                display: 'flex', gap: '8px', paddingTop: '4px',
                borderTop: '1px solid #f1f5f9', marginTop: '2px',
              }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: '8px', padding: '10px',
                    color: '#64748b', cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600, fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    background: loading ? '#e2e8f0' : '#0f172a',
                    color: loading ? '#94a3b8' : '#ffffff',
                    border: 'none', borderRadius: '8px', padding: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700, fontSize: '13px',
                    transition: 'background 0.15s',
                  }}
                >
                  {loading ? 'Creating…' : 'Create task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>,
      document.body,
    ) : null;

    return (
      <>
        <button
          onClick={() => { setError(''); setShowForm(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: '#0f172a', color: '#ffffff',
            padding: '10px 18px', borderRadius: '8px', border: 'none',
            cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: '13px',
            boxShadow: '0 1px 2px rgba(15,23,42,0.15)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          New task
        </button>
        {modal}
      </>
    );
  }

  /* ── Status transition buttons ───────────────────────────────────────── */
  const nextStatuses = NEXT_STATUSES[currentStatus ?? 'open'] ?? [];
  if (nextStatuses.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {nextStatuses.map((status) => (
        <button
          key={status}
          onClick={() => doAction(`/api/tasks/${taskId}`, 'PATCH', { status })}
          disabled={loading}
          style={{
            padding: '5px 11px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#64748b',
            fontSize: '12px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            whiteSpace: 'nowrap',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = '#f1f5f9'; b.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = '#f8fafc'; b.style.color = '#64748b';
          }}
        >
          {STATUS_LABELS[status] ?? status.replace('_', ' ')}
        </button>
      ))}
      {error && (
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#dc2626' }}>
          {error}
        </span>
      )}
    </div>
  );
}
