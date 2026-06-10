/**
 * check-and-award.ts — Badge Engine
 * ──────────────────────────────────────────────────────────────────────────────
 * Reads from the events table (append-only log) to decide whether to award a badge.
 * Never reads from feature tables (tasks, focus_sessions, etc.) directly.
 * Idempotent: awarding the same non-repeatable badge twice is a no-op.
 *
 * See 04-mysql-schema.md §4.8, §4.15 and 06-build-roadmap.md §4.3
 */

import { Prisma, type PrismaClient } from '@prisma/client';

// ─── Internal helper ──────────────────────────────────────────────────────────

async function awardBadge(
  db: PrismaClient,
  userId: string,
  badge: {
    id: string;
    badgeKey: string;
    isRepeatable: boolean;
    triggerThreshold: number | null;
  },
  eventCount: number,
  context?: Record<string, unknown>,
): Promise<boolean> {
  // Non-repeatable: check if user already has it
  if (!badge.isRepeatable) {
    const existing = await db.userBadge.findFirst({
      where: { userId, badgeId: badge.id },
      select: { id: true },
    });
    if (existing) return false; // Already earned — idempotent
  }

  // Threshold check
  const threshold = badge.triggerThreshold ?? 1;
  if (eventCount < threshold) return false;

  await db.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
      // Prisma requires InputJsonValue; cast is safe — context is always a plain object
      ...(context !== undefined && { context: context as Prisma.InputJsonValue }),
    },
  });

  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called after every meaningful event. Checks all active badges whose
 * triggerEventType matches and awards any that qualify.
 *
 * Returns the list of newly-awarded badge keys (empty if none).
 */
export async function checkAndAward(
  db: PrismaClient,
  userId: string,
  eventType: string,
): Promise<string[]> {
  // Load all active badge definitions that care about this event type
  const candidates = await db.badge.findMany({
    where: { triggerEventType: eventType, isActive: true },
    select: {
      id: true,
      badgeKey: true,
      isRepeatable: true,
      triggerThreshold: true,
    },
  });

  if (candidates.length === 0) return [];

  // Count how many times this user has produced this event type
  const eventCount = await db.event.count({
    where: { userId, eventType },
  });

  const awarded: string[] = [];

  for (const badge of candidates) {
    const wasAwarded = await awardBadge(db, userId, badge, eventCount);
    if (wasAwarded) awarded.push(badge.badgeKey);
  }

  return awarded;
}
