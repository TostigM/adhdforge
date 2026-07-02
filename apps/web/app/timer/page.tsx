/**
 * Focus Timer — M6 Analog Timer
 * ──────────────────────────────────────────────────────────────────────────────
 * Diminishing analog wedge, synthesized Sound Family alerts, Picture-in-Picture.
 * See 06-build-roadmap.md §6
 */

import Link from 'next/link';

import { db } from '@focus-forge/database/client';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';
import { requirePageUser } from '@/lib/require-user';
import { TimerClient } from './_components/TimerClient';

export default async function TimerPage() {
  const { userId } = await requirePageUser('/timer');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const prefs = parsePreferences(user?.preferences);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        aria-label="Timer navigation"
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

      <TimerClient
        soundEnabled={prefs.soundEnabled}
        hapticsEnabled={prefs.hapticsEnabled}
        tenThreeRuleEnabled={prefs.tenThreeRuleEnabled}
      />
    </div>
  );
}
