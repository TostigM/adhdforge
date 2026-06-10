/**
 * One-off script: seed tomorrow's tasks for manual smoke testing.
 * Run with: npx ts-node --project packages/database/tsconfig.seed.json scripts/create-tomorrow-tasks.ts
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const USER_EMAIL = 'tostig.meadbrewer@gmail.com';

// Tomorrow = 2026-06-01 in user's local timezone (America/Los_Angeles, UTC-7)
// Times stored as UTC: local + 7h
const TOMORROW = {
  // Anchor: Teams stand-up  8:30 AM PDT = 15:30 UTC
  standup:    new Date('2026-06-01T15:30:00.000Z'),
  // Anchor: Teams sync     11:30 AM PDT = 18:30 UTC
  sync:       new Date('2026-06-01T18:30:00.000Z'),
};

async function main() {
  const user = await db.user.findUnique({ where: { email: USER_EMAIL }, select: { id: true } });
  if (!user) throw new Error(`User ${USER_EMAIL} not found`);

  const userId = user.id;
  console.log(`Creating tasks for user ${userId}`);

  const tasks = [
    // ── Anchor meetings ──────────────────────────────────────────────────────
    {
      userId,
      rawText: 'Teams stand-up at 8:30 AM',
      title: 'Teams stand-up',
      priorityKind: 'anchor'  as const,
      priorityLevel: 'cant_miss' as const,
      scheduledFor: TOMORROW.standup,
      estimatedMinutes: 30,
      captureMethod: 'system' as const,
    },
    {
      userId,
      rawText: 'Teams team sync at 11:30 AM',
      title: 'Teams team sync',
      priorityKind: 'anchor' as const,
      priorityLevel: 'cant_miss' as const,
      scheduledFor: TOMORROW.sync,
      estimatedMinutes: 60,
      captureMethod: 'system' as const,
    },

    // ── Flexible tasks for tomorrow ──────────────────────────────────────────
    {
      userId,
      rawText: 'Prepare agenda for morning stand-up',
      priorityKind: 'flexible' as const,
      priorityLevel: 'high' as const,
      captureMethod: 'system' as const,
    },
    {
      userId,
      rawText: 'Review and respond to emails',
      priorityKind: 'flexible' as const,
      priorityLevel: 'med' as const,
      captureMethod: 'system' as const,
    },
    {
      userId,
      rawText: 'Update project notes after team sync',
      priorityKind: 'flexible' as const,
      priorityLevel: 'high' as const,
      captureMethod: 'system' as const,
    },
    {
      userId,
      rawText: 'Block 30 min for focused deep work',
      priorityKind: 'flexible' as const,
      priorityLevel: 'med' as const,
      estimatedMinutes: 30,
      captureMethod: 'system' as const,
    },
    {
      userId,
      rawText: 'Check in with the team on Slack',
      priorityKind: 'flexible' as const,
      priorityLevel: 'low' as const,
      captureMethod: 'system' as const,
    },
  ];

  for (const task of tasks) {
    const created = await db.task.create({ data: task, select: { id: true, rawText: true, priorityKind: true, scheduledFor: true } });
    const time = created.scheduledFor
      ? ` @ ${created.scheduledFor.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' })}`
      : '';
    console.log(`  [${created.priorityKind.toUpperCase()}] ${created.rawText}${time}`);
  }

  console.log(`\n✓ Created ${tasks.length} tasks for tomorrow.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
