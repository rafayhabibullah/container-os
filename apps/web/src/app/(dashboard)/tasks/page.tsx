import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TaskActions from './TaskActions';
import Link from 'next/link';

interface Task { id: string; title: string; status: string; dueAt: string | null; siteId: string; notes: string | null; }

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default async function TasksPage() {
  const user = await requireAuth();
  const tasks = await serverFetch<Task[]>(`/v1/organisations/${user.organisationId}/tasks`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          </div>
          <TaskActions type="create" />
        </div>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No tasks yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Title</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Due</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{task.title}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] ?? ''}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TaskActions type="update" taskId={task.id} currentStatus={task.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
