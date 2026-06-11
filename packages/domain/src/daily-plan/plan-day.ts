/**
 * plan-day.ts — The workday boundary
 * ──────────────────────────────────────────────────────────────────────────────
 * Single source of truth for "what day is it" in the daily-plan system.
 *
 * The plan day rolls over at MIDNIGHT IN THE WORKDAY TIMEZONE, not midnight UTC.
 * (The original UTC approximation flipped the dashboard to a new day at
 * 4–5 PM Pacific — mid-evening for the product owner.)
 *
 * Two distinct concepts, easy to conflate:
 *   • planDate — the LABEL stored in `daily_plans.plan_date` (@db.Date): always
 *     UTC midnight of the workday-timezone CALENDAR DATE. Never compare it to
 *     real timestamps.
 *   • day window — the real instants [dayStart, dayEnd) when that calendar day
 *     begins/ends in the workday timezone. Use this for filtering timestamp
 *     columns like `tasks.scheduledFor`.
 *
 * The timezone is a constant for now. It becomes a per-user preference in
 * M15.3 (Account Settings) — at that point these functions gain a tz parameter
 * read from user preferences, and this constant becomes the default.
 */

export const WORKDAY_TIMEZONE = 'America/Los_Angeles';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Calendar date (year, month 1-12, day) of `at` in `timeZone`. */
function calendarDateInZone(at: Date, timeZone: string): [number, number, number] {
  // en-CA reliably formats as YYYY-MM-DD
  const ymd = at.toLocaleDateString('en-CA', { timeZone });
  const parts = ymd.split('-');
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

/** Offset of `timeZone` from UTC at instant `at`, in ms (LA: -7h or -8h). */
function tzOffsetMs(at: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) parts[p.type] = p.value;
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallClockAsUtc - at.getTime();
}

/**
 * The real UTC instant of midnight on calendar date (y, m, d) in `timeZone`.
 * Two-pass offset correction handles DST transitions (the offset at the UTC
 * guess can differ from the offset at the corrected instant).
 */
function zonedMidnightUtc(y: number, m: number, d: number, timeZone: string): Date {
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  let t = utcGuess - tzOffsetMs(new Date(utcGuess), timeZone);
  t = utcGuess - tzOffsetMs(new Date(t), timeZone);
  return new Date(t);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * The plan-date LABEL for the workday containing `now`:
 * UTC midnight of the workday-timezone calendar date.
 *
 * Example: 2026-06-10T05:30:00Z is 10:30 PM June 9 in LA →
 * returns 2026-06-09T00:00:00Z.
 */
export function getPlanDate(now: Date = new Date()): Date {
  const [y, m, d] = calendarDateInZone(now, WORKDAY_TIMEZONE);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * The real-instant window [dayStart, dayEnd) of the workday named by a
 * planDate label. Use for filtering timestamp columns (e.g. anchors'
 * `scheduledFor`). DST days are naturally 23 or 25 hours long.
 */
export function getPlanDayWindow(planDate: Date): { dayStart: Date; dayEnd: Date } {
  const y = planDate.getUTCFullYear();
  const m = planDate.getUTCMonth() + 1;
  const d = planDate.getUTCDate();
  return {
    dayStart: zonedMidnightUtc(y, m, d, WORKDAY_TIMEZONE),
    dayEnd: zonedMidnightUtc(y, m, d + 1, WORKDAY_TIMEZONE),
  };
}
