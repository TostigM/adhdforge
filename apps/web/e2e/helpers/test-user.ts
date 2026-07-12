/**
 * test-user.ts — Seed and clean up the dedicated E2E test user.
 *
 * All E2E tests operate ONLY on this isolated user so they never touch real
 * data on the shared Bluehost DB. The user, its session, tasks, and plans are
 * created in global-setup and removed in global-teardown.
 *
 * Auth: we bypass the login UI by inserting a `sessions` row with a known
 * token and writing that token as the `next-auth.session-token` cookie into
 * Playwright's storage state. NextAuth v4 database sessions read this directly.
 */

import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

export const TEST_USER_EMAIL = 'e2e@focusforge.test';
export const TEST_USER_NAME = 'E2E Tester';

/** NextAuth v4 dev (http) session cookie name. */
export const SESSION_COOKIE_NAME = 'next-auth.session-token';

let _client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_client) _client = new PrismaClient();
  return _client;
}

export async function disconnectPrisma(): Promise<void> {
  if (_client) {
    await _client.$disconnect();
    _client = null;
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export type SeededAuth = {
  userId: string;
  sessionToken: string;
  expires: Date;
};

/**
 * Create (or reset) the test user and a fresh authenticated session.
 * Returns the session token to drop into the browser cookie.
 */
export async function seedTestUser(): Promise<SeededAuth> {
  const db = getPrisma();

  // Clean any prior state for a deterministic baseline
  await cleanupTestUser();

  const user = await db.user.create({
    data: {
      email: TEST_USER_EMAIL,
      name: TEST_USER_NAME,
      accountState: 'active',
      emailVerified: new Date(),
      tier: 'free',
    },
    select: { id: true },
  });

  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await db.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  return { userId: user.id, sessionToken, expires };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Remove the test user and ALL dependent rows. Order matters because of FKs:
 * plan items → plans, tasks, events, sessions, then the user.
 */
export async function cleanupTestUser(): Promise<void> {
  const db = getPrisma();

  const user = await db.user.findUnique({
    where: { email: TEST_USER_EMAIL },
    select: { id: true },
  });
  if (!user) return;

  const userId = user.id;

  // Daily plan items (via plans owned by user)
  const plans = await db.dailyPlan.findMany({ where: { userId }, select: { id: true } });
  const planIds = plans.map((p) => p.id);
  if (planIds.length > 0) {
    await db.dailyPlanItem.deleteMany({ where: { dailyPlanId: { in: planIds } } });
  }
  await db.dailyPlan.deleteMany({ where: { userId } });

  // Task steps (via tasks) then tasks
  const tasks = await db.task.findMany({ where: { userId }, select: { id: true } });
  const taskIds = tasks.map((t) => t.id);
  if (taskIds.length > 0) {
    await db.taskStep.deleteMany({ where: { taskId: { in: taskIds } } });
  }
  await db.task.deleteMany({ where: { userId } });

  // Misc per-user rows
  await db.event.deleteMany({ where: { userId } });
  await db.session.deleteMany({ where: { userId } });
  await db.userBadge.deleteMany({ where: { userId } }).catch(() => {});
  await db.auditLog.deleteMany({ where: { userId } }).catch(() => {});
  await db.scheduledAlert.deleteMany({ where: { userId } }).catch(() => {});

  await db.user.delete({ where: { id: userId } });
}

// ─── Task seeding helpers (used by individual specs) ─────────────────────────

export async function createFlexTask(
  userId: string,
  rawText: string,
  priorityLevel: 'low' | 'med' | 'high' = 'med',
): Promise<string> {
  const db = getPrisma();
  const task = await db.task.create({
    data: {
      userId,
      rawText,
      priorityKind: 'flexible',
      priorityLevel,
      status: 'active',
      captureMethod: 'text',
    },
    select: { id: true },
  });
  return task.id;
}

/** Create a flexible task plus ordered steps (status 'active'). Returns the task id. */
export async function createTaskWithSteps(
  userId: string,
  rawText: string,
  stepTexts: string[],
): Promise<string> {
  const db = getPrisma();
  const task = await db.task.create({
    data: { userId, rawText, priorityKind: 'flexible', priorityLevel: 'med', status: 'active', captureMethod: 'text' },
    select: { id: true },
  });
  for (let i = 0; i < stepTexts.length; i++) {
    await db.taskStep.create({
      data: { taskId: task.id, text: stepTexts[i]!, stepOrder: i, status: 'active' },
    });
  }
  return task.id;
}

/** Most-recent focus session for the user (for timer assertions). */
export async function getLatestFocusSession(userId: string) {
  const db = getPrisma();
  return db.focusSession.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    select: { id: true, status: true, plannedDurationSeconds: true, actualDurationSeconds: true, soundFamily: true },
  });
}

/** Count how many times the user holds a given badge. */
export async function countBadgeForUser(userId: string, badgeKey: string): Promise<number> {
  const db = getPrisma();
  return db.userBadge.count({ where: { userId, badge: { badgeKey } } });
}

/**
 * Seed a quota row at `count` for today's quota window so the next use is
 * blocked. Uses the same 04:00-UTC quota-day math as the server.
 */
export async function seedQuotaAtLimit(userId: string, quotaKey: string, count: number): Promise<void> {
  const db = getPrisma();
  const shifted = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
  // Clear any existing, then insert.
  await db.$executeRawUnsafe(
    `DELETE FROM quota_usage WHERE user_id = ? AND quota_key = ? AND usage_date_utc = ?`,
    userId, quotaKey, day,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO quota_usage (id, user_id, quota_key, usage_date_utc, count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))`,
    'qz' + Math.random().toString(36).slice(2, 12), userId, quotaKey, day, count,
  );
}

/** Read a task's status + its steps (ordered) for assertions. */
export async function getTaskState(taskId: string) {
  const db = getPrisma();
  return db.task.findUnique({
    where: { id: taskId },
    select: {
      status: true,
      steps: { orderBy: { stepOrder: 'asc' }, select: { text: true, status: true, stepOrder: true } },
    },
  });
}

/** Delete every task + plan for the test user (between specs that need a clean slate). */
export async function resetTestUserData(userId: string): Promise<void> {
  const db = getPrisma();
  const plans = await db.dailyPlan.findMany({ where: { userId }, select: { id: true } });
  const planIds = plans.map((p) => p.id);
  if (planIds.length > 0) {
    await db.dailyPlanItem.deleteMany({ where: { dailyPlanId: { in: planIds } } });
  }
  await db.dailyPlan.deleteMany({ where: { userId } });
  await db.task.deleteMany({ where: { userId } });
  await db.event.deleteMany({ where: { userId } });
  await db.focusSession.deleteMany({ where: { userId } });
  await db.userBadge.deleteMany({ where: { userId } }).catch(() => {});
  await db.scheduledAlert.deleteMany({ where: { userId } }).catch(() => {});
  await db.launchpadItem.deleteMany({ where: { userId } }).catch(() => {});
}

/** Create a launchpad item directly in the DB (M9 specs). Returns the item id. */
export async function createLaunchpadItem(
  userId: string,
  label: string,
  opts: {
    isChecked?: boolean;
    lastCheckedAt?: Date;
    resetSchedule?: 'never' | 'daily' | 'on_departure';
    displayOrder?: number;
  } = {},
): Promise<string> {
  const db = getPrisma();
  const item = await db.launchpadItem.create({
    data: {
      userId,
      label,
      displayOrder: opts.displayOrder ?? 0,
      isChecked: opts.isChecked ?? false,
      lastCheckedAt: opts.lastCheckedAt ?? null,
      resetSchedule: opts.resetSchedule ?? 'daily',
    },
    select: { id: true },
  });
  return item.id;
}

/** The user's launchpad items, in display order. */
export async function getLaunchpadItemsForUser(userId: string) {
  const db = getPrisma();
  return db.launchpadItem.findMany({
    where: { userId },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, label: true, isChecked: true, resetSchedule: true, displayOrder: true },
  });
}

/** All doorknob_zone alerts for the user (any status), oldest scheduled first. */
export async function getDoorknobAlerts(userId: string) {
  const db = getPrisma();
  return db.scheduledAlert.findMany({
    where: { userId, alertType: 'doorknob_zone' },
    orderBy: { scheduledFor: 'asc' },
    select: { status: true, scheduledFor: true, payload: true },
  });
}

/**
 * Mark all of the user's plans as ritual-skipped so the MorningRitual component
 * doesn't appear. Done by userId (not date) to dodge plan_date timezone quirks.
 */
export async function skipRitualForUser(userId: string): Promise<void> {
  const db = getPrisma();
  await db.dailyPlan.updateMany({
    where: { userId },
    data: { ritualState: 'skipped' },
  });
}

/** Reset the user's preferences to defaults (visibleSlots=3 etc.). */
export async function resetPreferences(userId: string): Promise<void> {
  const db = getPrisma();
  await db.user.update({
    where: { id: userId },
    data: { preferences: { visibleSlots: 3, gentleReframeEnabled: true, gentleReframeThreshold: 4 } },
  });
}

/** The most-recently-created plan for the user (today's plan after a dashboard visit). */
export async function getLatestPlanId(userId: string): Promise<string | null> {
  const db = getPrisma();
  const plan = await db.dailyPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  return plan?.id ?? null;
}

/**
 * Seed N flex tasks directly into a plan's queue (slotState='queue').
 * Queue items normally only appear after a swap; this lets the backlog-drawer
 * spec set up deterministically without driving N swaps through the slow DB.
 */
export async function addQueueItems(planId: string, userId: string, count: number): Promise<void> {
  const db = getPrisma();
  for (let i = 0; i < count; i++) {
    const task = await db.task.create({
      data: {
        userId,
        rawText: `Queued task ${i + 1}`,
        priorityKind: 'flexible',
        priorityLevel: 'med',
        status: 'active',
        captureMethod: 'text',
      },
      select: { id: true },
    });
    await db.dailyPlanItem.create({
      data: {
        dailyPlanId: planId,
        taskId: task.id,
        slotState: 'queue',
        source: 'manual',
        position: i,
      },
    });
  }
}
