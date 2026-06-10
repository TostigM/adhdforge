/**
 * Admin user detail page.
 * Action buttons appear based on permissions. All actions require justification.
 * See M2 task 2.11 and doc 01 §4.
 */
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { db } from '@focus-forge/database/client';
import { getAdminPermissions } from '@focus-forge/domain/admin/permissions';
import { sendPasswordReset } from './actions';

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; resetSent?: string; resetError?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return notFound();

  const { id } = await params;
  const { created, resetSent, resetError } = await searchParams;

  const [user, permissions, auditActions] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        accountState: true,
        pausedReason: true,
        pausedUntil: true,
        suspendedReason: true,
        compExpiresAt: true,
        compReason: true,
        pendingDeleteAt: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    getAdminPermissions(db, session.user.id),
    db.adminAction.findMany({
      where: { targetUserId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        action: true,
        justification: true,
        createdAt: true,
        adminUserId: true,
      },
    }),
  ]);

  if (!user) return notFound();

  const can = {
    pause:    permissions.includes('admin_user_pause'),
    suspend:  permissions.includes('admin_user_suspend'),
    delete:   permissions.includes('admin_user_soft_delete'),
    emergency:permissions.includes('admin_user_emergency_delete'),
    manage:   permissions.includes('admin_user_management'),
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {created && (
        <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-700/50">
          <p className="text-emerald-300 text-sm">
            ✓ Account created. {user.email} can now sign in.
          </p>
        </div>
      )}
      {resetSent && (
        <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-700/50">
          <p className="text-emerald-300 text-sm">
            ✓ Password reset email sent to {user.email}.
          </p>
        </div>
      )}
      {resetError && (
        <div className="p-3 rounded-lg bg-amber-900/40 border border-amber-700/50">
          <p className="text-amber-300 text-sm">
            ⚠ Failed to send the reset email. Check the server logs and try again.
          </p>
        </div>
      )}

      <div>
        <Link href="/admin/users" className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to users
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mt-2">
          {user.name ?? user.email}
        </h1>
        <p className="text-slate-400 text-sm">{user.email}</p>
      </div>

      {/* User info */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 space-y-3">
        <InfoRow label="User ID" value={user.id} mono />
        <InfoRow label="Tier" value={user.tier} />
        <InfoRow label="Account state" value={user.accountState} />
        <InfoRow label="Email verified" value={user.emailVerified ? 'Yes' : 'No'} />
        <InfoRow label="Joined" value={user.createdAt.toLocaleString()} />
        <InfoRow label="Last login" value={user.lastLoginAt?.toLocaleString() ?? 'Never'} />
        {user.pausedReason && <InfoRow label="Pause reason" value={user.pausedReason} />}
        {user.pausedUntil && <InfoRow label="Paused until" value={user.pausedUntil.toLocaleString()} />}
        {user.suspendedReason && <InfoRow label="Suspension reason" value={user.suspendedReason} />}
        {user.compReason && <InfoRow label="Comp reason (internal)" value={user.compReason} />}
        {user.compExpiresAt && <InfoRow label="Comp expires" value={user.compExpiresAt.toLocaleString()} />}
      </div>

      {/* Action buttons */}
      {(can.pause || can.suspend || can.delete || can.manage || can.emergency) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {can.pause && user.accountState === 'active' && (
              <ActionButton href={`/admin/users/${id}/pause`} label="Pause account" />
            )}
            {can.pause && user.accountState === 'paused' && (
              <ActionButton href={`/admin/users/${id}/unpause`} label="Unpause account" />
            )}
            {can.suspend && user.accountState !== 'suspended' && (
              <ActionButton href={`/admin/users/${id}/suspend`} label="Suspend account" variant="warning" />
            )}
            {can.suspend && user.accountState === 'suspended' && (
              <ActionButton href={`/admin/users/${id}/unsuspend`} label="Unsuspend account" />
            )}
            {can.manage && (
              <ActionButton href={`/admin/users/${id}/grant-comp`} label="Grant Comp tier" />
            )}
            {can.manage && (
              <form action={sendPasswordReset.bind(null, id)}>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-slate-200"
                >
                  Send password reset
                </button>
              </form>
            )}
            {can.delete && (
              <ActionButton href={`/admin/users/${id}/soft-delete`} label="Soft delete" variant="warning" />
            )}
            {can.emergency && (
              <ActionButton href={`/admin/users/${id}/emergency-delete`} label="Emergency delete" variant="danger" />
            )}
          </div>
          <p className="text-slate-500 text-xs mt-3">
            All actions require a justification and are logged permanently.
          </p>
        </div>
      )}

      {/* Audit trail */}
      {auditActions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Admin actions on this user
          </h2>
          <div className="bg-slate-900 rounded-xl divide-y divide-slate-800 border border-slate-800">
            {auditActions.map((action, i) => (
              <div key={i} className="px-4 py-3 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-sm font-mono">{action.action}</span>
                  <span className="text-slate-500 text-xs">{action.createdAt.toLocaleString()}</span>
                </div>
                {action.justification && (
                  <p className="text-slate-400 text-xs">{action.justification}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between text-sm gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-slate-200 text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function ActionButton({
  href,
  label,
  variant = 'default',
}: {
  href: string;
  label: string;
  variant?: 'default' | 'warning' | 'danger';
}) {
  const styles = {
    default: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
    warning: 'bg-amber-900/50 hover:bg-amber-900 text-amber-300 border border-amber-700/50',
    // Danger uses fuchsia — never red per Rule 1
    danger:  'bg-fuchsia-900/50 hover:bg-fuchsia-900 text-fuchsia-300 border border-fuchsia-700/50',
  };
  return (
    <a
      href={href}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${styles[variant]}`}
    >
      {label}
    </a>
  );
}
