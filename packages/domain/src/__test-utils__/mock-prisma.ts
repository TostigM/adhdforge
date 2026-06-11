/**
 * mock-prisma.ts — Lightweight PrismaClient mock for unit tests
 * ──────────────────────────────────────────────────────────────────────────────
 * Produces a typed partial mock of PrismaClient.
 * Domain functions receive `db: PrismaClient` — pass this mock directly.
 *
 * Usage:
 *   const db = makeMockPrisma();
 *   db.task.create.mockResolvedValue({ id: 'task_1', ... });
 *   const result = await createTask(db, input);
 *   expect(db.task.create).toHaveBeenCalledOnce();
 */

import type { PrismaClient } from '@prisma/client';
import { vi } from 'vitest';

// ─── Individual model mock factory ───────────────────────────────────────────

function modelMock() {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

// ─── Transaction mock ─────────────────────────────────────────────────────────
//
// $transaction receives a callback and calls it with the same mock db.
// This lets tests assert that operations inside $transaction were called.

function makeTxMock(db: MockPrisma) {
  return vi.fn().mockImplementation((cb: (tx: typeof db) => Promise<unknown>) => cb(db));
}

// ─── Full mock ────────────────────────────────────────────────────────────────

export type MockPrisma = {
  user: ReturnType<typeof modelMock>;
  task: ReturnType<typeof modelMock>;
  taskStep: ReturnType<typeof modelMock>;
  event: ReturnType<typeof modelMock>;
  badge: ReturnType<typeof modelMock>;
  userBadge: ReturnType<typeof modelMock>;
  dailyPlan: ReturnType<typeof modelMock>;
  dailyPlanItem: ReturnType<typeof modelMock>;
  focusSession: ReturnType<typeof modelMock>;
  quotaUsage: ReturnType<typeof modelMock>;
  $transaction: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
  $executeRaw: ReturnType<typeof vi.fn>;
};

export function makeMockPrisma(): MockPrisma & PrismaClient {
  const mock = {
    user: modelMock(),
    task: modelMock(),
    taskStep: modelMock(),
    event: modelMock(),
    badge: modelMock(),
    userBadge: modelMock(),
    dailyPlan: modelMock(),
    dailyPlanItem: modelMock(),
    focusSession: modelMock(),
    quotaUsage: modelMock(),
  } as unknown as MockPrisma;

  (mock as unknown as { $transaction: unknown }).$transaction = makeTxMock(mock);
  (mock as unknown as { $queryRaw: unknown }).$queryRaw = vi.fn();
  (mock as unknown as { $executeRaw: unknown }).$executeRaw = vi.fn();

  return mock as MockPrisma & PrismaClient;
}

// ─── Builders for common test fixtures ───────────────────────────────────────

export function makeTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task_test_01',
    userId: 'user_test_01',
    rawText: 'Buy oranges',
    title: null,
    notes: null,
    priorityKind: 'flexible',
    priorityLevel: 'med',
    todaySwapCount: 0,
    reframeOfferedAt: null,
    reframeSnoozedUntil: null,
    status: 'active',
    scheduledFor: null,
    estimatedMinutes: null,
    completedAt: null,
    deferredCount: 0,
    deferredUntil: null,
    captureMethod: 'text',
    aiMetadata: null,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

export function makeBadge(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'badge_first_capture',
    badgeKey: 'first_capture',
    displayName: 'First Capture',
    description: 'You trusted the app with a thought.',
    tier: 'bronze',
    triggerEventType: 'task.created',
    triggerThreshold: 1,
    isRepeatable: false,
    iconName: 'Sparkles',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'evt_test_01',
    userId: 'user_test_01',
    eventType: 'task.created',
    payload: { taskId: 'task_test_01' },
    occurredAt: new Date('2026-01-01T10:00:00Z'),
    ...overrides,
  };
}

export function makeDailyPlan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'plan_test_01',
    userId: 'user_test_01',
    planDate: new Date('2026-01-01T00:00:00Z'),
    visibleSlots: 3,
    ritualState: 'pending',
    ritualCompletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * A DailyPlanItem with its nested `dailyPlan` and `task` relations included.
 * Matches the shape returned by `dailyPlanItem.findUnique({ include: { dailyPlan, task } })`.
 */
export function makePlanItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item_test_01',
    dailyPlanId: 'plan_test_01',
    taskId: 'task_test_01',
    slotState: 'today',
    source: 'bubble',
    position: 0,
    completedAt: null,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    // Nested relations (as included by findUnique in daily-plan functions)
    dailyPlan: {
      id: 'plan_test_01',
      userId: 'user_test_01',
      visibleSlots: 3,
    },
    task: {
      id: 'task_test_01',
      status: 'active',
      priorityKind: 'flexible',
      priorityLevel: 'med',
      todaySwapCount: 0,
      reframeOfferedAt: null,
      reframeSnoozedUntil: null,
    },
    ...overrides,
  };
}
