/**
 * E2E: Launchpad (M9) — items by the door with daily reset.
 *
 * Covers the roadmap acceptance criteria:
 *   - items persist across sessions (reload)
 *   - the daily reset unchecks items after the 04:00 boundary (proved by
 *     seeding lastCheckedAt before the boundary — the lazy read resets it)
 *   - the dashboard widget summarises the launchpad
 *   - Doorknob setup prefils its checklist from unchecked items
 *   - Rule 1: no red anywhere on the page
 */

import {
  test,
  expect,
  getTestUserId,
  resetTestUserData,
  createLaunchpadItem,
  getLaunchpadItemsForUser,
} from './helpers/spec-base';

test.describe('Launchpad', () => {
  let userId: string;

  test.beforeAll(() => {
    userId = getTestUserId();
  });

  test.beforeEach(async () => {
    await resetTestUserData(userId);
  });

  test('add items, check one off, and it persists across a reload', async ({ page }) => {
    await page.goto('/launchpad');

    const input = page.getByLabel('New launchpad item');
    for (const label of ['Keys', 'Wallet', 'Lunch']) {
      await input.fill(label);
      await page.getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await page.getByRole('checkbox').first().check();
    await expect(page.getByText('1 of 3 by the door')).toBeVisible();

    await page.reload();
    await expect(page.getByText('1 of 3 by the door')).toBeVisible();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
  });

  test('daily items checked before the boundary uncheck on the next visit', async ({ page }) => {
    // Checked two days ago — unambiguously before the current 04:00 boundary.
    const stale = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await createLaunchpadItem(userId, 'Keys', { isChecked: true, lastCheckedAt: stale, displayOrder: 0 });
    await createLaunchpadItem(userId, 'Wallet', { isChecked: true, lastCheckedAt: stale, displayOrder: 1 });
    // A 'never' item stays checked through the reset.
    await createLaunchpadItem(userId, 'Spare mask', {
      isChecked: true,
      lastCheckedAt: stale,
      resetSchedule: 'never',
      displayOrder: 2,
    });

    await page.goto('/launchpad');

    await expect(page.getByText('1 of 3 by the door')).toBeVisible();
    const items = await getLaunchpadItemsForUser(userId);
    expect(items.find((i) => i.label === 'Keys')?.isChecked).toBe(false);
    expect(items.find((i) => i.label === 'Wallet')?.isChecked).toBe(false);
    expect(items.find((i) => i.label === 'Spare mask')?.isChecked).toBe(true);
  });

  test('dashboard widget shows the by-the-door count and links to the launchpad', async ({
    page,
  }) => {
    await createLaunchpadItem(userId, 'Keys', { isChecked: true, lastCheckedAt: new Date(), displayOrder: 0 });
    await createLaunchpadItem(userId, 'Wallet', { displayOrder: 1 });

    await page.goto('/dashboard');
    const widget = page.getByRole('link', { name: /Launchpad: 1 of 2 items by the door/ });
    await expect(widget).toBeVisible();
    await widget.click();
    await expect(page).toHaveURL(/\/launchpad$/);
    await expect(page.getByRole('heading', { name: 'Launchpad' })).toBeVisible();
  });

  test('Doorknob setup prefils its checklist from unchecked launchpad items', async ({ page }) => {
    await createLaunchpadItem(userId, 'Keys', { displayOrder: 0 });
    await createLaunchpadItem(userId, 'Water bottle', { displayOrder: 1 });
    await createLaunchpadItem(userId, 'Badge', { isChecked: true, lastCheckedAt: new Date(), displayOrder: 2 });

    await page.goto('/doorknob');
    await page.getByRole('button', { name: /Add from Launchpad \(2 unchecked\)/ }).click();

    const textarea = page.getByLabel('Anything to grab before you leave?');
    await expect(textarea).toHaveValue('Keys\nWater bottle');
  });

  test('no red colors anywhere on the launchpad (Rule 1)', async ({ page }) => {
    await createLaunchpadItem(userId, 'Keys', { displayOrder: 0 });
    await page.goto('/launchpad');
    await expect(page.getByText('Keys', { exact: true })).toBeVisible();

    const redCount = await page.evaluate(() => {
      const isReddish = (color: string) => {
        const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return false;
        const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
        return r > 150 && g < 80 && b < 80;
      };
      let count = 0;
      for (const el of Array.from(document.querySelectorAll('*'))) {
        const s = getComputedStyle(el);
        if (isReddish(s.color) || isReddish(s.backgroundColor) || isReddish(s.borderColor)) count++;
      }
      return count;
    });
    expect(redCount).toBe(0);
  });
});
