/**
 * E2E: Doorknob / Reverse Scheduler (M8)
 *
 * Scenarios:
 *  1. Setup → create session → timeline displays, 4 pending alerts persisted
 *  2. "Running late (+15 min)" → departure shifts, all pending alerts move +15
 *  3. Browser notification fires at a zone transition (stubbed Notification,
 *     clock fast-forward — no real notification, no real waiting)
 *  4. "I'm out the door" → doorknob_made badge, remaining alerts retired
 *  5. Cancel → back to setup, no badge
 *  6. No red anywhere on the live timeline (Rule 1)
 */

import {
  test,
  expect,
  getTestUserId,
  resetTestUserData,
  countBadgeForUser,
  getDoorknobAlerts,
  skipRitualForUser,
} from './helpers/spec-base';

const userId = getTestUserId();

/** datetime-local string (browser-local) for now + N minutes. */
function localArrivalIn(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Fill the setup form and start a session (arrival in `arrivalMinutes`, 20 min transit). */
async function startSession(page: import('@playwright/test').Page, arrivalMinutes = 120) {
  await page.goto('/doorknob');
  await expect(page.getByRole('heading', { name: 'Doorknob mode' })).toBeVisible();
  await page.getByLabel('When do you need to be there?').fill(localArrivalIn(arrivalMinutes));
  await page.getByRole('button', { name: '20 min', exact: true }).click();
  await page.getByLabel(/Anything to grab/).fill('keys\nwater bottle');
  await page.getByRole('button', { name: 'Show me the timeline' }).click();
  await expect(page.getByRole('heading', { name: /Leave by/ })).toBeVisible();
}

test.describe('Doorknob / Reverse Scheduler', () => {
  test.beforeEach(async () => {
    await resetTestUserData(userId);
  });

  test('creating a session shows the timeline and persists zone alerts', async ({ page }) => {
    await startSession(page);

    // Timeline with all four zones + the checklist
    await expect(page.getByRole('img', { name: /Timeline from/ })).toBeVisible();
    for (const label of ['Wrap up', 'Gather', 'Door', 'Transit']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('keys')).toBeVisible();

    // 4 pending doorknob_zone alerts persisted, in zone order
    await expect.poll(() => getDoorknobAlerts(userId).then((a) => a.length)).toBe(4);
    const alerts = await getDoorknobAlerts(userId);
    expect(alerts.every((a) => a.status === 'pending')).toBe(true);
    const zoneKeys = alerts.map((a) => (a.payload as { zoneKey: string }).zoneKey);
    expect(zoneKeys).toEqual(['wrap_up', 'gather', 'door', 'transit']);
  });

  test('+15 shifts the departure and every pending alert', async ({ page }) => {
    await startSession(page);

    const before = await getDoorknobAlerts(userId);
    const beforeHeading = await page.getByRole('heading', { name: /Leave by/ }).textContent();

    await page.getByRole('button', { name: /Running late/ }).click();
    await expect(page.getByText(/shifted 15 minutes/i)).toBeVisible();

    // Heading shows a new departure time
    await expect(page.getByRole('heading', { name: /Leave by/ })).not.toHaveText(beforeHeading ?? '');

    // Every pending alert moved exactly +15 min
    await expect
      .poll(async () => {
        const after = await getDoorknobAlerts(userId);
        return after.map((a, i) => a.scheduledFor.getTime() - (before[i]?.scheduledFor.getTime() ?? 0));
      })
      .toEqual([15 * 60_000, 15 * 60_000, 15 * 60_000, 15 * 60_000]);
  });

  test('a browser notification fires at the zone transition (stubbed)', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    // Record Notification constructions instead of showing anything.
    await page.addInitScript(() => {
      const recorded: Array<{ title: string; body: string }> = [];
      (window as unknown as { __notifications: typeof recorded }).__notifications = recorded;
      class FakeNotification {
        static permission = 'granted';
        static requestPermission = async () => 'granted';
        constructor(title: string, options?: { body?: string }) {
          recorded.push({ title, body: options?.body ?? '' });
        }
      }
      Object.defineProperty(window, 'Notification', { value: FakeNotification });
    });
    await page.clock.install();

    // Arrival in 65 min, transit 20 → wrap-up starts in ~5 min of client time
    await startSession(page, 65);

    await page.clock.runFor(6 * 60_000);

    const notifications = await page.evaluate(
      () => (window as unknown as { __notifications: Array<{ body: string }> }).__notifications,
    );
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifications[0]?.body).toMatch(/wrap up/i);
  });

  test('"I\'m out the door" completes the session and awards On Time', async ({ page }) => {
    await startSession(page);

    await page.getByRole('button', { name: /out the door/i }).click();

    // Lands back on the dashboard
    await expect(page.getByRole('heading', { name: /Hey,/ })).toBeVisible();

    await expect.poll(() => countBadgeForUser(userId, 'doorknob_made'), { timeout: 15_000 }).toBe(1);
    // No alerts left pending — retired neutrally
    const alerts = await getDoorknobAlerts(userId);
    expect(alerts.every((a) => a.status !== 'pending')).toBe(true);
  });

  test('cancelling returns to setup without a badge', async ({ page }) => {
    await startSession(page);

    await page.getByRole('button', { name: /Plans changed/ }).click();
    await expect(page.getByRole('heading', { name: 'Doorknob mode' })).toBeVisible();

    expect(await countBadgeForUser(userId, 'doorknob_made')).toBe(0);
    const alerts = await getDoorknobAlerts(userId);
    expect(alerts.every((a) => a.status === 'cancelled')).toBe(true);
  });

  test('an active session surfaces on Today and links back to the timeline', async ({ page }) => {
    await startSession(page);

    // Go to Today; the Doorknob summary should be visible and link to /doorknob.
    await page.goto('/dashboard');
    await skipRitualForUser(userId);
    await page.reload();

    const summary = page.getByRole('link', { name: /Doorknob: leave by/ });
    await expect(summary).toBeVisible();
    await expect(page.getByText(/Heading out later|Time to start getting ready/)).toBeVisible();

    await summary.click();
    await expect(page.getByRole('heading', { name: /Leave by/ })).toBeVisible();
  });

  test('no red colors on the live timeline (Rule 1)', async ({ page }) => {
    await startSession(page);

    const redOffenders = await page.evaluate(() => {
      const isRed = (c: string): boolean => {
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return false;
        const r = +(m[1] ?? 0), g = +(m[2] ?? 0), b = +(m[3] ?? 0);
        return r > 200 && g < 80 && b < 80;
      };
      const offenders: string[] = [];
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const s = getComputedStyle(el);
        if (isRed(s.color) || isRed(s.backgroundColor) || isRed(s.borderTopColor)) {
          offenders.push(el.tagName + '.' + (el.className || '(no class)'));
        }
      }
      return offenders;
    });

    expect(redOffenders).toEqual([]);
  });
});
