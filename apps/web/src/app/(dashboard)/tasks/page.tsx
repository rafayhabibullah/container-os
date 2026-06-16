import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import TaskActions from './TaskActions';
import TasksTable from './TasksTable';
import PlanLockedNotice from '../components/PlanLockedNotice';

export interface Task {
  id: string;
  title: string;
  status: string;
  type: string | null;
  priority: string;
  dueAt: string | null;
  siteId: string;
  unitId: string | null;
  tenantId: string | null;
  bookingId: string | null;
  assigneeId: string | null;
  notes: string | null;
}

export interface Site {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Entitlements {
  plan: string;
  features: string[];
}

export default async function TasksPage() {
  const user = await requireAuth();
  const t = getT();
  const [tasks, sites, members, entitlements] = await Promise.all([
    serverFetch<Task[]>(`/v1/organisations/${user.organisationId}/tasks`).catch(() => [] as Task[]),
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => [] as Site[]),
    serverFetch<Member[]>(`/v1/organisations/${user.organisationId}/members`).catch(() => [] as Member[]),
    serverFetch<Entitlements>(`/v1/organisations/${user.organisationId}/entitlements`).catch(() => ({ plan: 'free', features: [] } as Entitlements)),
  ]);
  const operationsEnabled = entitlements.features.includes('operations');

  const sitesById   = Object.fromEntries(sites.map((s) => [s.id, s]));
  const membersById = Object.fromEntries(members.map((m) => [m.userId, m]));

  const open       = tasks.filter((t) => t.status === 'open').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const blocked    = tasks.filter((t) => t.status === 'blocked').length;
  const completed  = tasks.filter((t) => t.status === 'completed').length;
  const overdue    = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'completed' && t.status !== 'cancelled').length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                {t('dashboard.tasks.title')}
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {overdue > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    {t('dashboard.tasks.overdue', { count: String(overdue) })}
                  </span>
                )}
                {open > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.tasks.open', { count: String(open) })}
                  </span>
                )}
                {inProgress > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.tasks.inProgress', { count: String(inProgress) })}
                  </span>
                )}
                {blocked > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.tasks.blocked', { count: String(blocked) })}
                  </span>
                )}
                {completed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.tasks.completed', { count: String(completed) })}
                  </span>
                )}
                {tasks.length === 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {t('dashboard.tasks.noTasksYet')}
                  </span>
                )}
              </div>
            </div>
            {operationsEnabled && <TaskActions type="create" sites={sites} members={members} />}
          </div>

          {operationsEnabled ? (
            <TasksTable tasks={tasks} sitesById={sitesById} membersById={membersById} />
          ) : (
            <PlanLockedNotice
              title="Tasks are available on Professional"
              body={`Your current ${entitlements.plan} plan keeps the basics enabled. Upgrade when you want assigned work, due dates, incident follow-ups, comments and SLA-style operations tracking across sites.`}
            />
          )}
        </div>
      </div>
    </>
  );
}
