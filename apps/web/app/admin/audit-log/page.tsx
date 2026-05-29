/**
 * Admin audit log viewer — read-only, entries can never be deleted.
 * See M2 task 2.13.
 */
import { db } from '@focus-forge/database/client';

interface SearchParams {
  action?: string;
  adminId?: string;
  targetId?: string;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const entries = await db.adminAction.findMany({
    where: {
      ...(resolvedParams.action && { action: { contains: resolvedParams.action } }),
      ...(resolvedParams.adminId && { adminUserId: resolvedParams.adminId }),
      ...(resolvedParams.targetId && { targetUserId: resolvedParams.targetId }),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      adminUser: { select: { email: true, name: true } },
      targetUser: { select: { email: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Audit Log</h1>
      <p className="text-slate-400 text-sm">
        All admin actions. Read-only — entries cannot be modified or deleted.
      </p>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="action"
          defaultValue={resolvedParams.action}
          placeholder="Filter by action…"
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-300 text-sm placeholder-slate-600
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200
                     rounded-xl text-sm transition-colors"
        >
          Filter
        </button>
        {(resolvedParams.action || resolvedParams.adminId || resolvedParams.targetId) && (
          <a href="/admin/audit-log" className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">
            Clear
          </a>
        )}
      </form>

      {/* Log entries */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-slate-500 text-sm">No entries found.</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-100">{entry.action}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-x-2">
                    {entry.adminUser && (
                      <span>
                        by <span className="text-slate-400">{entry.adminUser.email}</span>
                      </span>
                    )}
                    {entry.targetUser && (
                      <span>
                        → <span className="text-slate-400">{entry.targetUser.email}</span>
                      </span>
                    )}
                  </div>
                </div>
                <time className="text-slate-500 text-xs shrink-0">
                  {entry.createdAt.toLocaleString()}
                </time>
              </div>
              {entry.justification && (
                <p className="text-slate-400 text-sm border-l-2 border-slate-700 pl-3">
                  {entry.justification}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-slate-600 text-xs">Showing up to 100 most recent entries.</p>
    </div>
  );
}
