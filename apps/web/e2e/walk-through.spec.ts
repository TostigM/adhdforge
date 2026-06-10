/**
 * E2E: Walk Me Through It (M5)
 *
 * Scenarios:
 *  1. Editor — add a step manually, it appears in the list
 *  2. Editor — reorder (move down) swaps the order (persisted)
 *  3. Walk-through — shows one step at a time, advances through all,
 *     task auto-completes, lands on the completion screen
 *  4. Walk-through — pause (ESC) returns to dashboard; resuming starts at the
 *     correct (next incomplete) step
 *  5. Empty steps — /walk redirects to the editor
 *  6. Copy does NOT promise AI generation (M5 framing)
 */

import {
  test,
  expect,
  getTestUserId,
  resetTestUserData,
  createFlexTask,
  createTaskWithSteps,
  getTaskState,
} from './helpers/spec-base';

const userId = getTestUserId();

test.describe('Walk Me Through It', () => {
  test.beforeEach(async () => {
    await resetTestUserData(userId);
  });

  test('editor adds a step manually and shows M5 (no-AI) copy', async ({ page }) => {
    const taskId = await createFlexTask(userId, 'Clean the kitchen');
    await page.goto(`/tasks/${taskId}`);

    // M5 framing — no promise of AI generation
    await expect(page.getByText(/Voice-driven step generation coming soon/i)).toBeVisible();
    await expect(page.getByText(/generate steps/i)).toHaveCount(0);

    await page.getByLabel('Step text').fill('Clear the counters');
    await page.getByRole('button', { name: 'Add steps manually' }).click();

    await expect(page.getByText('Clear the counters')).toBeVisible();

    // Persisted
    const state = await getTaskState(taskId);
    expect(state?.steps.map((s) => s.text)).toContain('Clear the counters');
  });

  test('reordering moves a step down (persisted)', async ({ page }) => {
    const taskId = await createTaskWithSteps(userId, 'Pack for trip', ['Socks', 'Charger']);
    await page.goto(`/tasks/${taskId}`);

    await expect(page.getByText('Socks')).toBeVisible();

    // Move step 1 ("Socks") down
    await page.getByRole('button', { name: 'Move step 1 down' }).click();

    await expect
      .poll(async () => {
        const s = await getTaskState(taskId);
        return s?.steps.map((x) => x.text);
      }, { timeout: 15_000 })
      .toEqual(['Charger', 'Socks']);
  });

  test('walk-through advances through all steps and auto-completes the task', async ({ page }) => {
    const taskId = await createTaskWithSteps(userId, 'Morning routine', [
      'Drink water',
      'Stretch',
      'Make the bed',
    ]);
    await page.goto(`/walk/${taskId}`);

    // Step 1
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await expect(page.getByText('Drink water')).toBeVisible();
    await page.getByRole('button', { name: 'Done. Next step.' }).click();

    // Step 2
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    await expect(page.getByText('Stretch')).toBeVisible();
    await page.getByRole('button', { name: 'Done. Next step.' }).click();

    // Step 3
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Done. Next step.' }).click();

    // Completion screen
    await expect(page.getByRole('heading', { name: /All steps done/i })).toBeVisible();

    // Task auto-completed in the DB
    await expect
      .poll(async () => (await getTaskState(taskId))?.status, { timeout: 15_000 })
      .toBe('completed');
  });

  test('pause (ESC) returns to dashboard and resumes at the next step', async ({ page }) => {
    const taskId = await createTaskWithSteps(userId, 'Two-parter', ['First part', 'Second part']);
    await page.goto(`/walk/${taskId}`);

    // Complete the first step
    await expect(page.getByText('First part')).toBeVisible();
    await page.getByRole('button', { name: 'Done. Next step.' }).click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    // ESC pauses → dashboard
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/dashboard/);

    // Re-entering resumes at the second (incomplete) step
    await page.goto(`/walk/${taskId}`);
    await expect(page.getByText('Step 2 of 2')).toBeVisible();
    await expect(page.getByText('Second part')).toBeVisible();
  });

  test('walk-through with no steps redirects to the editor', async ({ page }) => {
    const taskId = await createFlexTask(userId, 'No steps yet');
    await page.goto(`/walk/${taskId}`);
    await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}`));
  });
});
