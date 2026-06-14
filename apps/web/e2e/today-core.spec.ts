/**
 * E2E: Today core loop (M4 + M4.5)
 *
 * Scenarios:
 *  1. Dashboard loads for the authenticated test user
 *  2. Empty state shows when there are no tasks (no shame language)
 *  3. Capture a task → it appears in the visible set
 *  4. Complete a task → it leaves the set and the next bubbles up (count holds)
 *  5. Push it back (swap) → swap counter increments, slots stay full
 *  6. No red colors anywhere on the dashboard (Inviolable Rule 1)
 */

import {
  test,
  expect,
  getTestUserId,
  gotoDashboardReady,
  resetTestUserData,
  createFlexTask,
  getPrisma,
} from './helpers/spec-base';

const userId = getTestUserId();

test.describe('Today core loop', () => {
  test.beforeEach(async () => {
    await resetTestUserData(userId);
  });

  test('dashboard loads for the authenticated user', async ({ page }) => {
    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('heading', { name: /Hey,/ })).toBeVisible();
    // Capture field present
    await expect(page.getByLabel('Task text')).toBeVisible();
  });

  test('shows a calm empty state when there are no tasks', async ({ page }) => {
    await gotoDashboardReady(page, userId);

    // The EmptyState message is unique ("…That's allowed."); the header subtitle
    // also contains "Nothing pressing" so we match the fuller phrase.
    await expect(page.getByText(/That's allowed/i)).toBeVisible();
    // No shame language
    await expect(page.getByText(/overdue/i)).toHaveCount(0);
    await expect(page.getByText(/failed/i)).toHaveCount(0);
    await expect(page.getByText(/you missed/i)).toHaveCount(0);
  });

  test('capturing a task makes it appear in the visible set', async ({ page }) => {
    await gotoDashboardReady(page, userId);

    const taskText = 'Water the plants';
    await page.getByLabel('Task text').fill(taskText);
    await page.getByRole('button', { name: 'Add' }).click();

    // The new task card should appear
    await expect(page.getByText(taskText)).toBeVisible();
    await expect(page.getByRole('article', { name: new RegExp(taskText) })).toBeVisible();
  });

  test('capturing a task when all slots are full surfaces it in the queue (never vanishes)', async ({ page }) => {
    // Fill all 3 visible slots with higher-priority tasks.
    await createFlexTask(userId, 'Slot one', 'high');
    await createFlexTask(userId, 'Slot two', 'high');
    await createFlexTask(userId, 'Slot three', 'high');
    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('article')).toHaveCount(3);

    // Capture a 4th (default med) — no room in the visible set.
    await page.getByLabel('Task text').fill('Buy stamps');
    await page.getByRole('button', { name: 'Add' }).click();

    // It must NOT silently disappear: it shows in the queue counter + drawer.
    const drawerToggle = page.getByRole('button', { name: /more in the queue/i });
    await expect(drawerToggle).toBeVisible();
    await drawerToggle.click();
    await expect(page.getByText('Buy stamps')).toBeVisible();
  });

  test('completing a task bubbles up the next one (count holds at 3)', async ({ page }) => {
    // 4 tasks, 3 visible slots → completing one keeps 3 cards
    await createFlexTask(userId, 'Alpha task');
    await createFlexTask(userId, 'Bravo task');
    await createFlexTask(userId, 'Charlie task');
    await createFlexTask(userId, 'Delta task');

    await gotoDashboardReady(page, userId);

    // 3 cards visible
    await expect(page.getByRole('article')).toHaveCount(3);

    // Complete the first card's task
    const firstCard = page.getByRole('article').first();
    const firstText = await firstCard.getByRole('paragraph').first().textContent();
    await firstCard.getByRole('button', { name: 'Done', exact: true }).click();

    // Still 3 cards after bubble-up, and the completed text is gone
    await expect(page.getByRole('article')).toHaveCount(3);
    if (firstText) {
      await expect(page.getByText(firstText, { exact: true })).toHaveCount(0);
    }

    // DB: exactly one task completed
    const completed = await getPrisma().task.count({
      where: { userId, status: 'completed' },
    });
    expect(completed).toBe(1);
  });

  test('push it back increments the swap counter and keeps slots full', async ({ page }) => {
    await createFlexTask(userId, 'Swap me');
    await createFlexTask(userId, 'Keep one');
    await createFlexTask(userId, 'Keep two');
    await createFlexTask(userId, 'Backlog one');

    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('article')).toHaveCount(3);

    // Push back the first visible card
    const firstCard = page.getByRole('article').first();
    await firstCard.getByRole('button', { name: 'Push it back' }).click();

    // The swap action increments todaySwapCount on exactly one task
    await expect
      .poll(
        async () =>
          getPrisma().task.count({ where: { userId, todaySwapCount: { gte: 1 } } }),
        { timeout: 15_000 },
      )
      .toBe(1);

    // Slots stay full (3 cards) after bubble-up settles
    await expect(page.getByRole('article')).toHaveCount(3);
  });

  test('pushing a task back surfaces a DIFFERENT task, not a ping-pong (regression)', async ({ page }) => {
    // Two highs + a med fill the 3 slots; the low starts in the queue.
    await createFlexTask(userId, 'High one', 'high');
    await createFlexTask(userId, 'High two', 'high');
    await createFlexTask(userId, 'Med three', 'med');
    await createFlexTask(userId, 'Low four', 'low');

    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('article')).toHaveCount(3);

    // 'Low four' is lowest priority → it is queued, not visible, to start.
    await expect(page.getByRole('article', { name: /Low four/ })).toHaveCount(0);

    // Push back the top card.
    const firstCard = page.getByRole('article').first();
    const pushedText = ((await firstCard.getByRole('paragraph').first().textContent()) ?? '').trim();
    await firstCard.getByRole('button', { name: 'Push it back' }).click();

    // The previously-queued 'Low four' must surface — proof a DIFFERENT task
    // bubbled in. Before the fix, the just-pushed (higher-priority) card
    // boomeranged straight back instead, because priority dominated the refill.
    await expect(page.getByRole('article', { name: /Low four/ })).toBeVisible();
    // The pushed-back card is no longer in the visible set.
    expect(pushedText.length).toBeGreaterThan(0);
    await expect(page.getByRole('article', { name: new RegExp(pushedText) })).toHaveCount(0);
    // Slots stay full.
    await expect(page.getByRole('article')).toHaveCount(3);
  });

  test('no red colors anywhere on the dashboard (Rule 1)', async ({ page }) => {
    await createFlexTask(userId, 'Color check task', 'high');
    await gotoDashboardReady(page, userId);

    // Scan every element's computed text/bg/border colors for a pure-red hue.
    // Amber (245,158,11) and fuchsia (217,70,239) pass; only crimson-style reds fail.
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
