/**
 * E2E: Praise Repository (M10).
 *
 * The full-loop spec drives the REAL sender page with Playwright's fake audio
 * device (same flags as voice-dump.spec.ts) and uploads a real object to the
 * dev R2 bucket — free-tier recipient, so no OpenAI call is made.
 */

import {
  test,
  expect,
  getTestUserId,
  resetTestUserData,
  createPraiseContact,
  seedPraiseMemo,
  getPraiseMemosForUser,
  seedQuotaAtLimit,
} from './helpers/spec-base';

test.describe('Praise Repository', () => {
  let userId: string;

  test.beforeAll(() => {
    userId = getTestUserId();
  });

  test.beforeEach(async () => {
    await resetTestUserData(userId);
  });

  test('full loop: create invite → sender records without an account → memo lands in the inbox', async ({
    page,
    browser,
  }) => {
    // Recipient creates the invite in the UI
    await page.goto('/account/praise-senders');
    await page.getByLabel('What do you call this person?').fill('Mom');
    await page.getByRole('button', { name: 'Create link' }).click();
    await expect(page.getByText(/shown once, copy it now/)).toBeVisible();
    const linkText = await page.locator('p.select-all').innerText();
    const inviteUrl = linkText.trim();
    expect(inviteUrl).toMatch(/\/praise\/[0-9a-f]{64}$/);

    // Sender opens it in a FRESH context — no session, no account
    const senderContext = await browser.newContext();
    const senderPage = await senderContext.newPage();
    await senderPage.goto(inviteUrl);
    await expect(senderPage.getByText('“Mom”')).toBeVisible();

    // Record ~1.5s from the fake mic, then send
    await senderPage.getByRole('button', { name: /Start recording/ }).click();
    await senderPage.waitForTimeout(1500);
    await senderPage.getByRole('button', { name: /Stop/ }).click();
    await senderPage.getByRole('button', { name: /Send it/ }).click();
    await expect(senderPage.getByText(/Sent\./)).toBeVisible({ timeout: 20_000 });
    await senderContext.close();

    // Recipient sees it
    await page.goto('/praise');
    await expect(page.getByRole('heading', { name: 'Mom' })).toBeVisible();
    const memos = await getPraiseMemosForUser(userId);
    expect(memos).toHaveLength(1);
    expect(memos[0]?.senderDisplayName).toBe('Mom');
  });

  test('a 4th memo auto-archives the oldest for a free recipient', async ({ page }) => {
    const { contactId, rawToken } = await createPraiseContact(userId, 'Coach');
    const oldest = await seedPraiseMemo(userId, contactId, {
      createdAt: new Date(Date.now() - 3 * 86_400_000),
    });
    await seedPraiseMemo(userId, contactId, { createdAt: new Date(Date.now() - 2 * 86_400_000) });
    await seedPraiseMemo(userId, contactId, { createdAt: new Date(Date.now() - 1 * 86_400_000) });

    // 4th arrives via the real upload API (tiny synthetic webm)
    const res = await page.request.post('/api/praise/upload', {
      multipart: {
        token: rawToken,
        durationMs: '5000',
        audio: {
          name: 'memo.webm',
          mimeType: 'audio/webm',
          buffer: Buffer.from('e2e-fake-webm-bytes'),
        },
      },
    });
    expect((await res.json()).ok).toBe(true);

    const memos = await getPraiseMemosForUser(userId);
    expect(memos).toHaveLength(4);
    expect(memos.find((m) => m.id === oldest)?.isArchived).toBe(true);
    expect(memos.filter((m) => !m.isArchived)).toHaveLength(3);
  });

  test('the 16th play shows the approved soft message — calm, verbatim', async ({ page }) => {
    const { contactId } = await createPraiseContact(userId, 'Mom');
    await seedPraiseMemo(userId, contactId);
    await seedQuotaAtLimit(userId, 'praise_play', 15);

    await page.goto('/praise');
    await page.getByRole('button', { name: /Play/ }).first().click();

    await expect(
      page.getByText('Take a breath. Come back tomorrow if you still need to listen.', {
        exact: false,
      }),
    ).toBeVisible();
  });

  test('reporting a memo hides it from the inbox immediately', async ({ page }) => {
    const { contactId } = await createPraiseContact(userId, 'Mom');
    await seedPraiseMemo(userId, contactId, { senderDisplayName: 'Odd One' });

    await page.goto('/praise');
    await expect(page.getByRole('heading', { name: 'Odd One' })).toBeVisible();

    await page.getByRole('button', { name: 'Report' }).click();
    await page.getByRole('radio', { name: 'Spam' }).check();
    await page.getByRole('dialog').getByRole('button', { name: 'Report' }).click();

    await expect(page.getByRole('heading', { name: 'Odd One' })).toBeHidden();
    await expect(page.getByText(/with our review team/)).toBeVisible();
  });

  test('no red colors on the praise surfaces (Rule 1)', async ({ page }) => {
    const { contactId } = await createPraiseContact(userId, 'Mom');
    await seedPraiseMemo(userId, contactId);

    for (const path of ['/praise', '/account/praise-senders']) {
      await page.goto(path);
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
      expect(redCount, `red elements on ${path}`).toBe(0);
    }
  });
});
