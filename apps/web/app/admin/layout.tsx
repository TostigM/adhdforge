/**
 * Admin layout — wraps all /admin/* routes.
 * Checks for minimum admin permission server-side.
 * Non-admins get a 404 page — never a 403 (don't reveal admin exists).
 * See doc 07 anti-pattern: "return 403 Forbidden when non-admins access /admin"
 */
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { db } from '@focus-forge/database/client';
import { hasAnyAdminPermission, MINIMUM_ADMIN_PERMISSIONS } from '@focus-forge/domain/admin/permissions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    notFound(); // Not found — don't reveal admin exists
  }

  const isAdmin = await hasAnyAdminPermission(
    db,
    session.user.id,
    MINIMUM_ADMIN_PERMISSIONS,
  );

  if (!isAdmin) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Admin mode banner */}
      <div className="bg-fuchsia-900/60 border-b border-fuchsia-700/50 px-4 py-2">
        <p className="text-fuchsia-200 text-xs font-medium text-center tracking-wide uppercase">
          ⚡ Admin Mode — actions here affect real user accounts
        </p>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <nav
          className="w-56 min-h-screen bg-slate-900 border-r border-slate-800 p-4 space-y-1"
          aria-label="Admin navigation"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Admin
          </p>
          <NavLink href="/admin" label="Dashboard" />
          <NavLink href="/admin/users" label="Users" />
          <NavLink href="/admin/audit-log" label="Audit Log" />
          <div className="pt-4 border-t border-slate-800 mt-4">
            <NavLink href="/dashboard" label="← Back to app" />
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 rounded-lg text-sm text-slate-400
                 hover:text-slate-100 hover:bg-slate-800 transition-colors"
    >
      {label}
    </a>
  );
}
