/**
 * nightly-reminder.ts — "Time to set up tomorrow's launchpad" (M9.3).
 * ──────────────────────────────────────────────────────────────────────────────
 * Persisted as a single pending `launchpad_nightly` scheduled_alerts row per
 * user (M8 pattern: alert rows ARE the schedule). Delivery is client-side
 * (browser Notification while the app is open); the daily cron sweeps overdue
 * rows to `fired` as bookkeeping. Opt-in only — never auto-enabled.
 *
 * ensureNightlyReminder() is idempotent and self-healing: called lazily from
 * the launchpad page load and from the settings action, it converges the
 * pending rows to exactly one at the next occurrence of the user's chosen
 * wall-clock time (or zero when disabled).
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import {
  calendarDateInZone,
  WORKDAY_TIMEZONE,
  zonedTimeUtc,
} from '../daily-plan/plan-day';
import { TIME_OF_DAY_PATTERN } from '../users/update-preferences';

// ─── Pure: next occurrence of a wall-clock time ───────────────────────────────

export function nextReminderInstant(timeLocal: string, now: Date = new Date()): Date {
  const [hStr, mStr] = timeLocal.split(':');
  const hour = Number(hStr);
  const minute = Number(mStr);
  const [y, m, d] = calendarDateInZone(now, WORKDAY_TIMEZONE);
  const today = zonedTimeUtc(y, m, d, hour, minute, WORKDAY_TIMEZONE);
  if (now.getTime() < today.getTime()) return today;
  return zonedTimeUtc(y, m, d + 1, hour, minute, WORKDAY_TIMEZONE);
}

// ─── Ensure / cancel the pending alert row ────────────────────────────────────

export type EnsureNightlyReminderInput = {
  userId: string;
  enabled: boolean;
  /** 'HH:MM' wall-clock in the workday timezone. */
  timeLocal: string;
  now?: Date;
};

export type EnsureNightlyReminderError = 'invalid_time' | 'db_error';

export type EnsureNightlyReminderResult = {
  /** The upcoming reminder instant, or null when disabled. */
  scheduledFor: Date | null;
};

export async function ensureNightlyReminder(
  db: PrismaClient,
  input: EnsureNightlyReminderInput,
): Promise<Result<EnsureNightlyReminderResult, EnsureNightlyReminderError>> {
  if (!TIME_OF_DAY_PATTERN.test(input.timeLocal)) {
    return err('invalid_time', 'Reminder time must be HH:MM (24-hour).');
  }
  const now = input.now ?? new Date();

  try {
    if (!input.enabled) {
      await db.scheduledAlert.updateMany({
        where: { userId: input.userId, alertType: 'launchpad_nightly', status: 'pending' },
        data: { status: 'cancelled' },
      });
      return ok({ scheduledFor: null });
    }

    const target = nextReminderInstant(input.timeLocal, now);

    // Keep an existing future row only if it matches the chosen time exactly;
    // otherwise replace (covers time changes and overdue rows the cron hasn't
    // swept yet).
    const pending = await db.scheduledAlert.findMany({
      where: { userId: input.userId, alertType: 'launchpad_nightly', status: 'pending' },
      select: { id: true, scheduledFor: true },
    });

    const keep = pending.find((a) => a.scheduledFor.getTime() === target.getTime());
    const staleIds = pending.filter((a) => a.id !== keep?.id).map((a) => a.id);

    if (staleIds.length > 0) {
      await db.scheduledAlert.updateMany({
        where: { id: { in: staleIds } },
        data: { status: 'cancelled' },
      });
    }

    if (!keep) {
      await db.scheduledAlert.create({
        data: {
          userId: input.userId,
          alertType: 'launchpad_nightly',
          scheduledFor: target,
          payload: { timeLocal: input.timeLocal },
        },
      });
    }

    return ok({ scheduledFor: target });
  } catch (e) {
    console.error('[launchpad] nightly reminder scheduling failed:', e);
    return err('db_error', 'Failed to schedule the reminder.');
  }
}
