/**
 * Admin user list — search by email, filter by state/tier.
 */
import Link from 'next/link';
import { db } from '@focus-forge/database/client';

interface SearchParams {
  q?: string;
  state?: string;
  tier?: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, state, tier } = await searchParams;

  const users = await db.user.findMany({
    where: {
      accountState: { not: 'deleted' },
      ...(state && { accountState: state as never }),
      ...(tier && { tier: tier as never }),
      ...(q && {
        email: { contains: q },
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      accountState: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Users</h1>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white
                     rounded-xl text-sm font-medium transition-colors"
        >
          + Create account
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by email…"
          className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-100 placeholder-slate-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          name="state"
          defaultValue={state ?? ''}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All states</option>
          <option value="unverified">Unverified</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="suspended">Suspended</option>
          <option value="pending_delete">Pending deletion</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white
                     rounded-xl text-sm font-medium transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
        {users.length === 0 ? (
          <p className="text-slate-500 text-sm p-6 text-center">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Tier</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">State</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Joined</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Last login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-200">
                    <div>{user.email}</div>
                    {user.name && (
                      <div className="text-slate-500 text-xs">{user.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={user.tier} />
                  </td>
                  <td className="px-4 py-3">
                    <StateBadge state={user.accountState} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {user.lastLoginAt?.toLocaleDateString() ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/admin/users/${user.id}`}
                      className="text-indigo-400 hover:text-indigo-300 text-xs"
                    >
                      View →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-slate-500 text-xs">Showing up to 50 results. Use search to filter.</p>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free:          'bg-slate-700 text-slate-300',
    legacy_free:   'bg-slate-600 text-slate-200',
    comp:          'bg-indigo-900 text-indigo-300',
    paid:          'bg-emerald-900 text-emerald-300',
    paid_lifetime: 'bg-emerald-800 text-emerald-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[tier] ?? styles.free}`}>
      {tier.replace('_', ' ')}
    </span>
  );
}

function StateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    unverified:     'bg-amber-900/50 text-amber-300',
    active:         'bg-emerald-900/50 text-emerald-300',
    paused:         'bg-slate-700 text-slate-300',
    suspended:      'bg-fuchsia-900/50 text-fuchsia-300',
    pending_delete: 'bg-amber-900/50 text-amber-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[state] ?? ''}`}>
      {state.replace('_', ' ')}
    </span>
  );
}
