/**
 * Admin dashboard — quick links and summary stats.
 */
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { db } from '@focus-forge/database/client';
import { getAdminPermissions } from '@focus-forge/domain/admin/permissions';

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [permissions, userCount, recentActions] = await Promise.all([
    getAdminPermissions(db, session.user.id),
    db.user.count({ where: { accountState: { not: 'deleted' } } }),
    db.adminAction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { action: true, createdAt: true, adminUserId: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          You have {permissions.length} admin permission{permissions.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total users" value={userCount.toString()} />
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickLink href="/admin/users" label="Browse users" description="Search and manage user accounts" />
          <QuickLink href="/admin/audit-log" label="Audit log" description="View all admin actions" />
          <QuickLink href="/admin/reports" label="Content reports" description="Review reported praise memos" />
        </div>
      </div>

      {/* Recent actions */}
      {recentActions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Recent admin actions
          </h2>
          <div className="bg-slate-900 rounded-xl divide-y divide-slate-800">
            {recentActions.map((action, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <span className="text-slate-300 text-sm font-mono">{action.action}</span>
                <span className="text-slate-500 text-xs">
                  {action.createdAt.toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
          <a href="/admin/audit-log" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
            View all →
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block bg-slate-900 rounded-xl p-4 border border-slate-800
                 hover:border-slate-600 transition-colors"
    >
      <p className="text-slate-100 font-medium text-sm">{label}</p>
      <p className="text-slate-500 text-xs mt-0.5">{description}</p>
    </a>
  );
}
