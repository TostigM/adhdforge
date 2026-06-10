/**
 * Dashboard / Today — M4.5: The Core Loop
 * ──────────────────────────────────────────────────────────────────────────────
 * Home screen is Today (small visible set), not the backlog.
 * Server component: fetches/creates today's plan, passes state to TodayClient.
 *
 * See 02-design-system.md §13.5, 06-build-roadmap.md §4.5
 */

import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { db } from '@focus-forge/database/client';
import { getOrCreateTodayPlan } from '@focus-forge/domain/daily-plan/get-or-create-today-plan';
import { getTodayView } from '@focus-forge/domain/daily-plan/get-today-view';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';

import { authOptions } from '@/lib/auth';
import { TodayClient } from './_components/TodayClient';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin?callbackUrl=/dashboard');

  const userId = session.user.id;

  // Derive today's UTC midnight date
  const planDate = new Date();
  planDate.setUTCHours(0, 0, 0, 0);

  const [user, plan] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, preferences: true },
    }),
    getOrCreateTodayPlan(db, userId, planDate),
  ]);

  const { gentleReframeEnabled, gentleReframeThreshold } = parsePreferences(user?.preferences);

  const view = await getTodayView(
    db,
    plan.id,
    userId,
    // When reframe is disabled, use an unreachable threshold so the card never shows
    gentleReframeEnabled ? gentleReframeThreshold : Number.MAX_SAFE_INTEGER,
  );

  const displayName =
    user?.name?.split(' ')[0] ??
    user?.email?.split('@')[0] ??
    'there';

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Top nav */}
      <nav
        className="flex items-center justify-end gap-4 px-4 py-3 border-b border-[var(--border)]"
        aria-label="Dashboard navigation"
      >
        <Link
          href="/timer"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ⏱ Focus timer
        </Link>
        <Link
          href="/account"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Account →
        </Link>
      </nav>

      <TodayClient view={view} displayName={displayName} />
    </div>
  );
}
