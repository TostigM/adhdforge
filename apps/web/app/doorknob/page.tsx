/**
 * Doorknob / Reverse Scheduler — M8
 * ──────────────────────────────────────────────────────────────────────────────
 * "I need to be somewhere at X" → backward-calculated, color-coded lead-up.
 * Server component: loads the active session (if any) and hands off to the
 * setup form or the live timeline.
 *
 * See 06-build-roadmap.md M8, 02-design-system.md §9 (DoorknobTimeline)
 */

import Link from 'next/link';

import { db } from '@focus-forge/database/client';
import { getActiveDoorknob } from '@focus-forge/domain/doorknob/get-active-doorknob';
import { getLaunchpadItems } from '@focus-forge/domain/launchpad/list-items';

import { requirePageUser } from '@/lib/require-user';
import { DoorknobClient, type SerializedDoorknobSession } from './_components/DoorknobClient';
import { DoorknobSetup } from './_components/DoorknobSetup';

export default async function DoorknobPage() {
  const { userId } = await requirePageUser('/doorknob');

  const result = await getActiveDoorknob(db, userId);
  const active = result.ok ? result.value : null;

  const serialized: SerializedDoorknobSession | null = active
    ? {
        sessionId: active.sessionId,
        arrivalAtIso: active.schedule.arrivalAt.toISOString(),
        departAtIso: active.schedule.departAt.toISOString(),
        startAtIso: active.schedule.startAt.toISOString(),
        zones: active.schedule.zones.map((z) => ({
          key: z.key,
          label: z.label,
          color: z.color,
          startsAtIso: z.startsAt.toISOString(),
          endsAtIso: z.endsAt.toISOString(),
        })),
        preDepartureTasks: active.preDepartureTasks,
        pendingAlerts: active.pendingAlerts.map((a) => ({
          zoneKey: a.zoneKey,
          scheduledForIso: a.scheduledFor.toISOString(),
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav
        className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[var(--border)]"
        aria-label="Doorknob navigation"
      >
        <Link
          href="/dashboard"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to Today
        </Link>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {serialized ? (
          <DoorknobClient session={serialized} />
        ) : (
          <DoorknobSetup launchpadLabels={await getUncheckedLaunchpadLabels(userId)} />
        )}
      </main>
    </div>
  );
}

/** Unchecked launchpad items, offered as one-tap pre-departure checklist prefill (M9). */
async function getUncheckedLaunchpadLabels(userId: string): Promise<string[]> {
  const result = await getLaunchpadItems(db, userId);
  if (!result.ok) return []; // the setup form works fine without the offer
  return result.value.filter((i) => !i.isChecked).map((i) => i.label);
}
