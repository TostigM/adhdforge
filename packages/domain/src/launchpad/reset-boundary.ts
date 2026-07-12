/**
 * reset-boundary.ts — When did the launchpad last reset?
 * ──────────────────────────────────────────────────────────────────────────────
 * Daily launchpad items uncheck at 04:00 in the workday timezone (matching the
 * quota-day spirit: nobody's "day" ends at midnight when they're up late).
 *
 * v1 treats the reset time as a fixed 04:00 — the per-item `resetTimeLocal`
 * column exists per doc 04 §4.11 but activates together with per-user
 * timezones (M15.3). The timezone is the shared WORKDAY_TIMEZONE constant.
 *
 * Pure — no I/O.
 */

import { calendarDateInZone, WORKDAY_TIMEZONE, zonedTimeUtc } from '../daily-plan/plan-day';

export const LAUNCHPAD_RESET_HOUR = 4;

/**
 * The most recent instant the workday-timezone wall clock read 04:00.
 * Any daily item last checked BEFORE this instant is due for a reset.
 */
export function lastResetBoundary(now: Date = new Date()): Date {
  const [y, m, d] = calendarDateInZone(now, WORKDAY_TIMEZONE);
  const todayBoundary = zonedTimeUtc(y, m, d, LAUNCHPAD_RESET_HOUR, 0, WORKDAY_TIMEZONE);
  if (now.getTime() >= todayBoundary.getTime()) return todayBoundary;
  // Before 04:00 local — the boundary was yesterday. Date.UTC normalizes d-1=0.
  return zonedTimeUtc(y, m, d - 1, LAUNCHPAD_RESET_HOUR, 0, WORKDAY_TIMEZONE);
}
