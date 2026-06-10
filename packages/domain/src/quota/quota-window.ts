/**
 * quota-window.ts — The global 04:00 UTC quota-day window.
 * ──────────────────────────────────────────────────────────────────────────────
 * All quotas reset at 04:00 UTC for every user. A "quota day" is the UTC date of
 * (now − 4h). The next reset is that day's 00:00 UTC + 28h (= next 04:00 UTC).
 *
 * `quotaDayStr` is a plain 'YYYY-MM-DD' string used directly against the
 * `usage_date_utc` DATE column — using a string (not a JS Date) keeps the value
 * identical between the read (check) and the write (increment), sidestepping any
 * DATE-column timezone ambiguity.
 *
 * See 05-monetization-strategy.md §4.1
 */

export type QuotaWindow = {
  /** 'YYYY-MM-DD' — the current quota day (UTC date of now−4h). */
  quotaDayStr: string;
  /** The next 04:00 UTC reset instant. */
  resetsAtUtc: Date;
};

export function getQuotaWindow(now: Date = new Date()): QuotaWindow {
  const shifted = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  const quotaDayStr = `${y}-${pad(m + 1)}-${pad(d)}`;

  // Day's UTC midnight + 28h = next 04:00 UTC.
  const resetsAtUtc = new Date(Date.UTC(y, m, d) + 28 * 60 * 60 * 1000);

  return { quotaDayStr, resetsAtUtc };
}
