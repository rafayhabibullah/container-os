'use client';

import { useState, useMemo } from 'react';
import TaskActions from './TaskActions';
import TaskDetailSheet from './TaskDetailSheet';
import { TYPE_LABELS, PRIORITY_COLORS } from './task-constants';
import type { Task, Site, Member } from './page';

interface Props {
  tasks: Task[];
  sitesById: Record<string, Site>;
  membersById: Record<string, Member>;
}

const STAT: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  open:        { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Open'        },
  in_progress: { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'In progress' },
  blocked:     { dot: '#a855f7', text: '#7e22ce', bg: '#fdf4ff', border: '#e9d5ff', label: 'Blocked'     },
  completed:   { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Completed'   },
  cancelled:   { dot: '#94a3b8', text: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Cancelled'   },
};

const FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'open',        label: 'Open'        },
  { key: 'in_progress', label: 'In progress' },
  { key: 'blocked',     label: 'Blocked'     },
  { key: 'completed',   label: 'Completed'   },
  { key: 'cancelled',   label: 'Cancelled'   },
] as const;

export default function TasksTable({ tasks, sitesById, membersById }: Props) {
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filtered = useMemo(() =>
    tasks.filter((t) => {
      const q      = query.trim().toLowerCase();
      const site   = sitesById[t.siteId]?.name ?? t.siteId;
      const matchQ = !q || t.title.toLowerCase().includes(q) || site.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || t.status === statusFilter;
      return matchQ && matchS;
    }),
    [tasks, query, statusFilter, sitesById],
  );

  const isDue = (t: Task) =>
    !!t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'completed' && t.status !== 'cancelled';

  return (
    <>
      <style>{`
        @keyframes task-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .task-row { animation: task-row-in 0.25s ease both; cursor: pointer; }
        .task-row:hover { background: #f8fafc !important; }
        .task-filter-btn { transition: all 0.12s ease; }
        .task-filter-btn:hover { color: #0f172a !important; }
        .task-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {FILTERS.map((f) => {
              const active = statusFilter === f.key;
              const count  = f.key === 'all' ? tasks.length : tasks.filter((t) => t.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="task-filter-btn"
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none',
                    background: active ? '#f1f5f9' : 'transparent',
                    color: active ? '#0f172a' : '#94a3b8',
                    fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: active ? 600 : 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  {f.label}
                  <span style={{
                    background: active ? '#e2e8f0' : '#f8fafc',
                    color: active ? '#475569' : '#cbd5e1',
                    borderRadius: '4px', padding: '1px 6px',
                    fontSize: '11px', fontWeight: 600,
                    minWidth: '20px', textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          <div
            className="task-search-box"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '7px 12px',
              minWidth: '220px', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#0f172a', fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {tasks.length === 0 ? 'No tasks yet' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {tasks.length === 0 ? 'Create your first task to get started.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Site', 'Title', 'Type', 'Priority', 'Assignee', 'Status', 'Due', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 16px',
                    fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700, color: '#94a3b8',
                    letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => {
                const stat         = STAT[task.status] ?? STAT.open;
                const priColor     = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
                const overdue      = isDue(task);
                const siteName     = sitesById[task.siteId]?.name ?? task.siteId.slice(0, 8) + '…';
                const assigneeName = task.assigneeId
                  ? (membersById[task.assigneeId]?.user?.name ?? task.assigneeId.slice(0, 6) + '…')
                  : null;
                return (
                  <tr
                    key={task.id}
                    className="task-row"
                    onClick={() => setSelectedTask(task)}
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    {/* Site */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', color: '#64748b',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '5px', padding: '2px 8px', whiteSpace: 'nowrap',
                      }}>
                        {siteName}
                      </span>
                    </td>

                    {/* Title */}
                    <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {task.title}
                      </span>
                      {task.notes && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                          {task.notes}
                        </p>
                      )}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {task.type ? (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '2px 8px' }}>
                          {TYPE_LABELS[task.type] ?? task.type}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: priColor.bg, color: priColor.text,
                        border: `1px solid ${priColor.border}`,
                        borderRadius: '20px', padding: '2px 9px',
                        fontSize: '11px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        textTransform: 'capitalize',
                      }}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {assigneeName ? (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#475569' }}>
                          {assigneeName}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: stat.bg, color: stat.text,
                        border: `1px solid ${stat.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block' }} />
                        {stat.label}
                      </span>
                    </td>

                    {/* Due */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {task.dueAt ? (
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '13px',
                          color: overdue ? '#dc2626' : '#64748b',
                          fontWeight: overdue ? 600 : 400,
                        }}>
                          {overdue && '⚠ '}
                          {new Date(task.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <TaskActions type="update" taskId={task.id} currentStatus={task.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          sitesById={sitesById}
          membersById={membersById}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
