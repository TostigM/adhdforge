/**
 * Dashboard / Today — M4.5: The Core Loop
 * ──────────────────────────────────────────────────────────────────────────────
 * Home screen is Today (small visible set), not the backlog.
 * Server component: fetches/creates today's plan, passes state to TodayClient.
 *
 * See 02-design-system.md §13.5, 06-build-roadmap.md §4.5
 */

import Link from 'next/link';

import { db } from '@focus-forge/database/client';
import { getOrCreateTodayPlan } from '@focus-forge/domain/daily-plan/get-or-create-today-plan';
import { getPlanDate } from '@focus-forge/domain/daily-plan/plan-day';
import { getTodayView } from '@focus-forge/domain/daily-plan/get-today-view';
import { getActiveDoorknob } from '@focus-forge/domain/doorknob/get-active-doorknob';
import { getLaunchpadItems } from '@focus-forge/domain/launchpad/list-items';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';

import { requirePageUser } from '@/lib/require-user';
import {
  TodayClient,
  type DoorknobSummary,
  type LaunchpadSummary,
} from './_components/TodayClient';

export default async function DashboardPage() {
  const { userId } = await requirePageUser('/dashboard');

  // Today's plan-day label (rolls over at midnight in the workday timezone)
  const planDate = getPlanDate();

  const [user, plan, doorknobResult, launchpadResult] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, preferences: true },
    }),
    getOrCreateTodayPlan(db, userId, planDate),
    getActiveDoorknob(db, userId),
    getLaunchpadItems(db, userId), // also applies the lazy daily reset
  ]);

  const { gentleReframeEnabled, gentleReframeThreshold } = parsePreferences(user?.preferences);

  const view = await getTodayView(
    db,
    plan.id,
    userId,
    // When reframe is disabled, use an unreachable threshold so the card never shows
    gentleReframeEnabled ? gentleReframeThreshold : Number.MAX_SAFE_INTEGER,
  );

  // Active Doorknob session (if any) surfaces as a calm summary on Today.
  const active = doorknobResult.ok ? doorknobResult.value : null;
  const doorknob: DoorknobSummary | null = active
    ? {
        departAtIso: active.schedule.departAt.toISOString(),
        startAtIso: active.schedule.startAt.toISOString(),
        arrivalAtIso: active.schedule.arrivalAt.toISOString(),
        positionState: active.position.state,
      }
    : null;

  // Launchpad widget data — only shown when the user has items.
  const launchpad: LaunchpadSummary | null = launchpadResult.ok
    ? {
        checked: launchpadResult.value.filter((i) => i.isChecked).length,
        total: launchpadResult.value.length,
      }
    : null;

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
          href="/doorknob"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          🚪 Doorknob
        </Link>
        <Link
          href="/launchpad"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          🎒 Launchpad
        </Link>
        <Link
          href="/praise"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          💜 Praise
        </Link>
        <Link
          href="/account"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Account →
        </Link>
      </nav>

      <TodayClient view={view} displayName={displayName} doorknob={doorknob} launchpad={launchpad} />
    </div>
  );
}
