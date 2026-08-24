/**
 * /admin/reports — reactive moderation queue (M10, doc 06 §10.6).
 * Requires admin_content_moderate; everyone else gets a 404 (never a 403).
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { db } from '@focus-forge/database/client';
import { getAdminPermissions } from '@focus-forge/domain/admin/permissions';
import { listOpenReports } from '@focus-forge/domain/praise/admin-review';

import { authOptions } from '@/lib/auth';

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();
  const perms = await getAdminPermissions(db, session.user.id);
  if (!perms.includes('admin_content_moderate')) notFound();

  const reports = await listOpenReports(db);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-slate-100">
      <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 text-sm">
        ← Admin
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">Content reports</h1>
      <p className="text-sm text-slate-400 mb-6">
        Reactive moderation only — memo audio is reachable exclusively through the open reports
        below, and every access is audit-logged.
      </p>

      {!reports.ok ? (
        <p className="text-slate-400">The queue didn’t load. Refresh to retry.</p>
      ) : reports.value.length === 0 ? (
        <p className="text-slate-400">No open reports. 🎉</p>
      ) : (
        <ul className="space-y-2">
          {reports.value.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/reports/${r.id}`}
                className="block rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {r.reasonCategory}
                      <span className="ml-2 text-xs text-slate-400">({r.status})</span>
                    </p>
                    {r.reasonDetails && (
                      <p className="text-sm text-slate-400 truncate max-w-md">{r.reasonDetails}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {r.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
