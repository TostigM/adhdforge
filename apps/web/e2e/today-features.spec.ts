/**
 * E2E: Today features (M4.5)
 *
 * Scenarios:
 *  7. Priority picker — Anchor toggle hides the Bronze/Silver/Gold level chips
 *  8. Capture with Gold selected → the new card shows the GOLD priority label
 *  9. Single-task mode — toggle shows only one card + "N more waiting" note
 * 10. Backlog drawer — "Show all" reveals queued items
 * 11. Settings — lowering visible slots shows fewer cards on the dashboard
 * 12. Settings — preference change persists across reloads
 */

import {
  test,
  expect,
  getTestUserId,
  gotoDashboardReady,
  resetTestUserData,
  resetPreferences,
  createFlexTask,
  getLatestPlanId,
  addQueueItems,
} from './helpers/spec-base';

const userId = getTestUserId();

test.describe('Today features', () => {
  test.beforeEach(async () => {
    await resetTestUserData(userId);
    await resetPreferences(userId);
  });

  test('priority picker hides level chips when Anchor is selected', async ({ page }) => {
    await gotoDashboardReady(page, userId);

    // Flexible mode: level chips visible
    await expect(page.getByRole('button', { name: 'Silver' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gold' })).toBeVisible();

    // Switch to Anchor → level chips disappear, hint appears
    await page.getByRole('button', { name: /Anchor/ }).click();
    await expect(page.getByRole('button', { name: 'Silver' })).toHaveCount(0);
    await expect(page.getByText(/Time-pinned/i)).toBeVisible();

    // Back to Flexible → chips return
    await page.getByRole('button', { name: 'Flexible' }).click();
    await expect(page.getByRole('button', { name: 'Silver' })).toBeVisible();
  });

  test('capturing with Gold priority produces a Gold card', async ({ page }) => {
    await gotoDashboardReady(page, userId);

    await page.getByRole('button', { name: 'Gold' }).click();
    await page.getByLabel('Task text').fill('High priority thing');
    await page.getByRole('button', { name: 'Add' }).click();

    const card = page.getByRole('article', { name: /High priority thing/ });
    await expect(card).toBeVisible();
    await expect(card.getByText('GOLD')).toBeVisible();
  });

  test('single-task mode shows one card and a "more waiting" note', async ({ page }) => {
    await createFlexTask(userId, 'Focus one');
    await createFlexTask(userId, 'Focus two');
    await createFlexTask(userId, 'Focus three');

    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('article')).toHaveCount(3);

    // Enter single-task mode
    await page.getByRole('button', { name: 'One thing at a time' }).click();

    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: /Focus on this/i })).toBeVisible();
    await expect(page.getByText(/more tasks? waiting/i)).toBeVisible();

    // Exit
    await page.getByRole('button', { name: 'Show everything' }).click();
    await expect(page.getByRole('article')).toHaveCount(3);
  });

  test('backlog drawer reveals queued items', async ({ page }) => {
    // Fill all 3 today slots so bubble-up won't promote the queue items we add.
    await createFlexTask(userId, 'Visible A');
    await createFlexTask(userId, 'Visible B');
    await createFlexTask(userId, 'Visible C');
    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('article')).toHaveCount(3);

    const planId = await getLatestPlanId(userId);
    expect(planId).not.toBeNull();
    await addQueueItems(planId!, userId, 2);
    await page.reload();

    // Counter shows "2 more in the queue"
    const drawerToggle = page.getByRole('button', { name: /more in the queue/i });
    await expect(drawerToggle).toBeVisible();
    await expect(drawerToggle).toHaveAttribute('aria-expanded', 'false');

    // Open the drawer
    await drawerToggle.click();
    await expect(drawerToggle).toHaveAttribute('aria-expanded', 'true');

    // "Up next" section with the queued tasks
    await expect(page.getByText('Queued task 1')).toBeVisible();
    await expect(page.getByText('Queued task 2')).toBeVisible();
  });

  test('lowering visible slots shows fewer cards', async ({ page }) => {
    await createFlexTask(userId, 'Card one');
    await createFlexTask(userId, 'Card two');
    await createFlexTask(userId, 'Card three');

    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('article')).toHaveCount(3);

    // Go to settings and decrease slots 3 → 2
    await page.goto('/account');
    await page.getByRole('button', { name: 'Decrease visible slots' }).click();

    // Wait for the SERVER save to commit (not just the optimistic UI) — the
    // slow DB means navigating too early would read the stale slot count.
    const { getPrisma } = await import('./helpers/spec-base');
    await expect.poll(async () => {
      const u = await getPrisma().user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });
      return (u?.preferences as { visibleSlots?: number } | null)?.visibleSlots;
    }, { timeout: 15_000 }).toBe(2);

    // Back to dashboard — now only 2 cards render
    await page.goto('/dashboard');
    await expect(page.getByRole('article')).toHaveCount(2);
  });

  test('preference change persists across reloads', async ({ page }) => {
    await page.goto('/account');

    // Decrease slots and reload — value should stick
    await page.getByRole('button', { name: 'Decrease visible slots' }).click();
    await expect.poll(async () => {
      const { getPrisma } = await import('./helpers/spec-base');
      const u = await getPrisma().user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });
      return (u?.preferences as { visibleSlots?: number } | null)?.visibleSlots;
    }, { timeout: 15_000 }).toBe(2);

    await page.reload();
    // Settings page still renders after reload (multiple toggles exist now:
    // Gentle Reframe + the M6 timer sound/haptics switches).
    await expect(page.getByRole('switch').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Decrease visible slots' })).toBeVisible();
  });
});
