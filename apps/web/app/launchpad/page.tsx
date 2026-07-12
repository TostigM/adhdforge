/**
 * Launchpad — M9. The user's daily "items by the door."
 * ──────────────────────────────────────────────────────────────────────────────
 * Server component: applies the lazy daily reset via getLaunchpadItems, heals
 * the nightly-reminder alert row (idempotent), and hands off to the client.
 *
 * See 04-mysql-schema.md §4.11, 06-build-roadmap.md M9.
 */

import Link from 'next/link';

import { db } from '@focus-forge/database/client';
import { getLaunchpadItems } from '@focus-forge/domain/launchpad/list-items';
import { ensureNightlyReminder } from '@focus-forge/domain/launchpad/nightly-reminder';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';

import { requirePageUser } from '@/lib/require-user';
import { LaunchpadClient } from './_components/LaunchpadClient';

export default async function LaunchpadPage() {
  const { userId } = await requirePageUser('/launchpad');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const { launchpadReminderEnabled, launchpadReminderTime } = parsePreferences(user?.preferences);

  // Self-healing: converges the pending launchpad_nightly rows to exactly one
  // (or zero when disabled) and tells us when the next reminder fires so the
  // client can arm its notification timer.
  const reminder = await ensureNightlyReminder(db, {
    userId,
    enabled: launchpadReminderEnabled,
    timeLocal: launchpadReminderTime,
  });
  const reminderAtIso =
    reminder.ok && reminder.value.scheduledFor ? reminder.value.scheduledFor.toISOString() : null;

  const items = await getLaunchpadItems(db, userId);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        aria-label="Launchpad navigation"
      >
        <Link
          href="/dashboard"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to today
        </Link>
        <Link
          href="/account"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Settings →
        </Link>
      </nav>

      {items.ok ? (
        <LaunchpadClient items={items.value} reminderAtIso={reminderAtIso} />
      ) : (
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-[var(--text-secondary)]">
            The launchpad didn’t load just now. A refresh usually sorts it out.
          </p>
        </main>
      )}
    </div>
  );
}
