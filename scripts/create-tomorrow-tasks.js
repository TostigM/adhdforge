// One-off script: create tomorrow's tasks for manual smoke testing.
// Run with: node scripts/create-tomorrow-tasks.js

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();
const USER_EMAIL = 'tostig.meadbrewer@gmail.com';

// Tomorrow = 2026-06-01, user timezone = America/Los_Angeles (UTC-7 / PDT)
// UTC times = local + 7h
const tasks = [
  {
    rawText: 'Teams stand-up at 8:30 AM',
    title: 'Teams stand-up',
    priorityKind: 'anchor',
    priorityLevel: 'cant_miss',
    scheduledFor: new Date('2026-06-01T15:30:00.000Z'), // 8:30 AM PDT
    estimatedMinutes: 30,
    captureMethod: 'system',
  },
  {
    rawText: 'Teams team sync at 11:30 AM',
    title: 'Teams team sync',
    priorityKind: 'anchor',
    priorityLevel: 'cant_miss',
    scheduledFor: new Date('2026-06-01T18:30:00.000Z'), // 11:30 AM PDT
    estimatedMinutes: 60,
    captureMethod: 'system',
  },
  {
    rawText: 'Prepare agenda for morning stand-up',
    priorityKind: 'flexible',
    priorityLevel: 'high',
    captureMethod: 'system',
  },
  {
    rawText: 'Review and respond to emails',
    priorityKind: 'flexible',
    priorityLevel: 'med',
    captureMethod: 'system',
  },
  {
    rawText: 'Update project notes after team sync',
    priorityKind: 'flexible',
    priorityLevel: 'high',
    captureMethod: 'system',
  },
  {
    rawText: 'Block 30 min for focused deep work',
    priorityKind: 'flexible',
    priorityLevel: 'med',
    estimatedMinutes: 30,
    captureMethod: 'system',
  },
  {
    rawText: 'Check in with team on Slack',
    priorityKind: 'flexible',
    priorityLevel: 'low',
    captureMethod: 'system',
  },
];

async function main() {
  const user = await db.user.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true },
  });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);

  console.log(`Creating ${tasks.length} tasks for tomorrow...\n`);

  for (const task of tasks) {
    const created = await db.task.create({
      data: { userId: user.id, ...task },
      select: { id: true, rawText: true, priorityKind: true, priorityLevel: true, scheduledFor: true },
    });

    const time = created.scheduledFor
      ? ' @ ' + created.scheduledFor.toLocaleTimeString('en-US', {
          timeZone: 'America/Los_Angeles',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    console.log(`  [${created.priorityKind.padEnd(8)} ${created.priorityLevel.padEnd(9)}] ${created.rawText}${time}`);
  }

  console.log(`\n✓ Done.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
