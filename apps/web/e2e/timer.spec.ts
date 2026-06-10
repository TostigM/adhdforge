/**
 * E2E: Analog Timer (M6)
 *
 * Scenarios:
 *  1. Setup renders presets + sound families
 *  2. Starting a timer creates a running session + first_focus badge + wedge
 *  3. Completing a timer (clock fast-forward) → completion screen +
 *     focus_complete badge + session 'completed'
 *  4. Pause → resume → stop ends the session 'incomplete' (neutral)
 *  5. No red anywhere on the running timer (Rule 1)
 */

import {
  test,
  expect,
  getTestUserId,
  resetTestUserData,
  getLatestFocusSession,
  countBadgeForUser,
} from './helpers/spec-base';

const userId = getTestUserId();

test.describe('Analog Timer', () => {
  test.beforeEach(async () => {
    await resetTestUserData(userId);
  });

  test('setup shows duration presets and sound families', async ({ page }) => {
    await page.goto('/timer');
    await expect(page.getByRole('heading', { name: 'Focus timer' })).toBeVisible();
    await expect(page.getByRole('button', { name: '25 min' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Soft Chimes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Singing Bowls' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pink Noise Pulse' })).toBeVisible();
  });

  test('starting a timer creates a running session and awards first_focus', async ({ page }) => {
    await page.goto('/timer');
    await page.getByRole('button', { name: '15 min' }).click();
    await page.getByRole('button', { name: 'Start focus' }).click();

    // Wedge (role=img) + controls appear
    await expect(page.getByRole('img', { name: /Focus timer/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    await expect.poll(() => getLatestFocusSession(userId).then((s) => s?.status), { timeout: 15_000 }).toBe('running');
    const session = await getLatestFocusSession(userId);
    expect(session?.plannedDurationSeconds).toBe(15 * 60);
    await expect.poll(() => countBadgeForUser(userId, 'first_focus'), { timeout: 15_000 }).toBe(1);
  });

  test('completing a timer awards focus_complete (clock fast-forward)', async ({ page }) => {
    await page.clock.install();
    await page.goto('/timer');

    // 1-minute custom timer for a quick fast-forward
    await page.getByLabel('Custom minutes').fill('1');
    await page.getByRole('button', { name: 'Start focus' }).click();
    await expect(page.getByRole('img', { name: /Focus timer/i })).toBeVisible();

    // Advance past the planned minute — the tick loop should complete the timer
    await page.clock.runFor(65_000);

    await expect(page.getByRole('heading', { name: /Focus complete/i })).toBeVisible();
    await expect.poll(() => getLatestFocusSession(userId).then((s) => s?.status), { timeout: 15_000 }).toBe('completed');
    await expect.poll(() => countBadgeForUser(userId, 'focus_complete'), { timeout: 15_000 }).toBe(1);
  });

  test('pause → resume → stop ends the session as incomplete (neutral)', async ({ page }) => {
    await page.goto('/timer');
    await page.getByRole('button', { name: '25 min' }).click();
    await page.getByRole('button', { name: 'Start focus' }).click();

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    await page.getByRole('button', { name: 'Stop' }).click();

    // Back to setup, session recorded as 'incomplete' (never 'failed')
    await expect(page.getByRole('button', { name: 'Start focus' })).toBeVisible();
    await expect.poll(() => getLatestFocusSession(userId).then((s) => s?.status), { timeout: 15_000 }).toBe('incomplete');
  });

  test('navigating away mid-session (no pop-out) ends it neutrally, not orphaned', async ({ page }) => {
    await page.goto('/timer');
    await page.getByRole('button', { name: '25 min' }).click();
    await page.getByRole('button', { name: 'Start focus' }).click();
    await expect(page.getByRole('img', { name: /Focus timer/i })).toBeVisible();

    // Click the nav "Back to today" link mid-session
    await page.getByRole('link', { name: /Back to today/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // The session is ended as 'incomplete' (neutral) — never left 'running'.
    await expect
      .poll(() => getLatestFocusSession(userId).then((s) => s?.status), { timeout: 15_000 })
      .toBe('incomplete');
  });

  test('no red colors on the running timer (Rule 1)', async ({ page }) => {
    await page.goto('/timer');
    await page.getByRole('button', { name: 'Start focus' }).click();
    await expect(page.getByRole('img', { name: /Focus timer/i })).toBeVisible();

    const redOffenders = await page.evaluate(() => {
      const isRed = (c: string): boolean => {
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return false;
        const r = +(m[1] ?? 0), g = +(m[2] ?? 0), b = +(m[3] ?? 0);
        return r > 200 && g < 80 && b < 80;
      };
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const s = getComputedStyle(el);
        if (isRed(s.color) || isRed(s.backgroundColor) || isRed(s.fill ?? '')) {
          out.push(el.tagName);
        }
      }
      return out;
    });
    expect(redOffenders).toEqual([]);
  });
});
