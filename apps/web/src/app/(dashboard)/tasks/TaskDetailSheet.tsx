'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Task, Site, Member } from './page';

const TYPE_LABELS: Record<string, string> = {
  move_in: 'Move-in', move_out: 'Move-out', inspect_unit: 'Inspect unit',
  clean_unit: 'Clean unit', repair_unit: 'Repair unit', verify_document: 'Verify document',
  approve_booking: 'Approve booking', call_tenant: 'Call tenant',
  collect_payment: 'Collect payment', assign_access: 'Assign access',
  upload_contract: 'Upload contract', other: 'Other',
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  low:    { text: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  normal: { text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  high:   { text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent: { text: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open:        ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['completed',   'blocked', 'cancelled'],
  blocked:     ['in_progress', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In progress', blocked: 'Blocked',
  completed: 'Completed', cancelled: 'Cancelled',
};

interface Props {
  task: Task;
  sitesById: Record<string, Site>;
  membersById: Record<string, Member>;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '9px 12px', color: '#0f172a', fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  marginBottom: '5px', letterSpacing: '0.06em', textTransform: 'uppercase' as const,
};

export default function TaskDetailSheet({ task, sitesById, membersById, onClose }: Props) {
  const router = useRouter();
  const [notes,   setNotes]   = useState(task.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function patch(data: object) {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { message?: string }).message ?? 'Failed');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function transitionStatus(status: string) {
    await patch({ status });
    onClose();
  }

  const siteName     = sitesById[task.siteId]?.name ?? task.siteId;
  const assignee     = task.assigneeId ? membersById[task.assigneeId]?.user : null;
  const priColor     = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
  const nextStatuses = STATUS_TRANSITIONS[task.status] ?? [];
  const isOverdue    = !!task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes sheet-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheet-slide-in    { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .task-detail-backdrop { animation: sheet-backdrop-in 0.2s ease both; }
        .task-detail-sheet    { animation: sheet-slide-in    0.25s cubic-bezier(0.16,1,0.3,1) both; }
        .task-detail-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
        .task-transition-btn:hover { background: #f1f5f9 !important; color: #0f172a !important; }
      `}</style>

      <div
        className="task-detail-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 50,
        }}
      />

      <div
        className="task-detail-sheet"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '420px', maxWidth: '100vw',
          background: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          boxShadow: '-8px 0 40px rgba(15,23,42,0.12)',
          zIndex: 51,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.3 }}>
              {task.title}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', borderRadius: '4px', padding: '2px 7px', border: '1px solid #e2e8f0' }}>
                {siteName}
              </span>
              {task.type && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', background: '#f1f5f9', borderRadius: '4px', padding: '2px 7px', border: '1px solid #e2e8f0' }}>
                  {TYPE_LABELS[task.type] ?? task.type}
                </span>
              )}
              <span style={{
                fontSize: '11px', fontWeight: 700,
                color: priColor.text, background: priColor.bg,
                borderRadius: '20px', padding: '2px 8px', border: `1px solid ${priColor.border}`,
                textTransform: 'capitalize',
              }}>
                {task.priority}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
              width: '28px', height: '28px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: '14px', flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* Details */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={labelStyle}>Status</p>
              <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, margin: 0 }}>
                {STATUS_LABELS[task.status] ?? task.status}
              </p>
            </div>
            <div>
              <p style={labelStyle}>Due date</p>
              <p style={{ fontSize: '13px', color: isOverdue ? '#dc2626' : '#0f172a', margin: 0, fontWeight: isOverdue ? 600 : 400 }}>
                {task.dueAt
                  ? `${isOverdue ? '⚠ ' : ''}${new Date(task.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : '—'}
              </p>
            </div>
            <div>
              <p style={labelStyle}>Assignee</p>
              <p style={{ fontSize: '13px', color: '#0f172a', margin: 0 }}>
                {assignee?.name ?? '—'}
              </p>
            </div>
            <div>
              <p style={labelStyle}>Site</p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                {siteName}
              </p>
            </div>
          </div>

          {/* Linked records */}
          {(task.unitId || task.tenantId || task.bookingId) && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ ...labelStyle, marginBottom: '8px' }}>Linked records</p>
              {task.unitId    && <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Unit:</strong> {task.unitId}</p>}
              {task.tenantId  && <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Tenant:</strong> {task.tenantId}</p>}
              {task.bookingId && <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Booking:</strong> {task.bookingId}</p>}
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes…"
              className="task-detail-input"
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
            <button
              onClick={() => patch({ notes })}
              disabled={loading || notes === (task.notes ?? '')}
              style={{
                marginTop: '8px', padding: '7px 14px',
                background: loading || notes === (task.notes ?? '') ? '#f1f5f9' : '#0f172a',
                color: loading || notes === (task.notes ?? '') ? '#94a3b8' : '#fff',
                border: 'none', borderRadius: '7px',
                cursor: loading || notes === (task.notes ?? '') ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Saving…' : 'Save notes'}
            </button>
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 10px', margin: 0 }}>
              {error}
            </p>
          )}

          {/* Status transitions */}
          {nextStatuses.length > 0 && (
            <div>
              <p style={{ ...labelStyle, marginBottom: '8px' }}>Move to</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => transitionStatus(status)}
                    disabled={loading}
                    className="task-transition-btn"
                    style={{
                      padding: '7px 14px',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '7px', color: '#475569',
                      fontSize: '12px', fontWeight: 600,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    → {STATUS_LABELS[status] ?? status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
