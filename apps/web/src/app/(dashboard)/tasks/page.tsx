import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TaskActions from './TaskActions';
import { Badge } from '@sitelager/ui';

interface Task {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  siteId: string;
  notes: string | null;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'warning',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'outline',
};

export default async function TasksPage() {
  const user = await requireAuth();
  const tasks = await serverFetch<Task[]>(
    `/v1/organisations/${user.organisationId}/tasks`,
  ).catch(() => [] as Task[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <TaskActions type="create" />
      </div>

      {/* Table / empty state */}
      {tasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No tasks yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Title
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Due
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => (
                <tr
                  key={task.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">{task.title}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANT[task.status] ?? 'outline'}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">
                    {task.dueAt
                      ? new Date(task.dueAt).toLocaleDateString('de-DE')
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <TaskActions
                      type="update"
                      taskId={task.id}
                      currentStatus={task.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {tasks.length} of {tasks.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
