/**
 * reset-today-plan.js — Wipe today's DailyPlan items so they regenerate fresh.
 *
 * Run when bubble-up pulled wrong tasks into the plan (e.g. future anchors).
 * On next dashboard load, get-or-create-today-plan will reseed anchors correctly
 * and bubble-up will fill with flexible tasks only.
 *
 * Usage:
 *   $env:DATABASE_URL = (Get-Content apps\web\.env.local | Select-String '^DATABASE_URL' | ForEach-Object { $_ -replace '^DATABASE_URL="?', '' -replace '"?$', '' })
 *   node scripts/reset-today-plan.js
 */

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();
const USER_EMAIL = 'tostig.meadbrewer@gmail.com';

async function main() {
  const user = await db.user.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true },
  });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);

  // Today's plan date = UTC midnight of today
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  console.log(`Resetting plan for ${today.toISOString().slice(0, 10)} (user ${user.id})`);

  const plan = await db.dailyPlan.findUnique({
    where: { userId_planDate: { userId: user.id, planDate: today } },
  });

  if (!plan) {
    console.log('No plan found for today — nothing to reset.');
    return;
  }

  // Count items before deletion
  const items = await db.dailyPlanItem.findMany({
    where: { dailyPlanId: plan.id },
    select: { id: true, slotState: true, task: { select: { rawText: true, priorityKind: true } } },
  });

  console.log(`\nFound ${items.length} items in today's plan:`);
  for (const item of items) {
    console.log(`  [${item.slotState.padEnd(6)} ${item.task.priorityKind.padEnd(8)}] ${item.task.rawText}`);
  }

  // Delete all plan items (not the plan itself — that would lose ritualState)
  const { count } = await db.dailyPlanItem.deleteMany({
    where: { dailyPlanId: plan.id },
  });

  console.log(`\n✓ Deleted ${count} plan items. Reload the dashboard to regenerate.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
