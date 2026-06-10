/**
 * morning-reset.js — One-command clean testing state for the dashboard.
 *
 * What it does (default):
 *   1. Deletes today's DailyPlan (+ items)
 *   2. Deletes all ACTIVE/DEFERRED tasks (the ones that bubble up)
 *      — completed tasks are kept so badge/history isn't wiped
 *   3. Seeds a fresh, known set for TODAY:
 *        • 3 anchors (9:30 AM, 1:00 PM, 4:00 PM local)
 *        • 6 flexible tasks spread across Gold / Silver / Bronze
 *   4. Next dashboard load regenerates the plan from this fresh set.
 *
 * Flags:
 *   --hard   Also delete completed tasks, ALL plans, and events (full nuke).
 *
 * Usage (no PowerShell env dance needed — it loads .env.local itself):
 *   node scripts/morning-reset.js
 *   node scripts/morning-reset.js --hard
 *
 * Dates are computed dynamically, so this never goes stale.
 */

const fs = require('node:fs');
const path = require('node:path');

// ── Load DATABASE_URL from apps/web/.env.local ───────────────────────────────
(function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
  let contents;
  try {
    contents = fs.readFileSync(envPath, 'utf8');
  } catch {
    console.error(`Could not read ${envPath}. Set DATABASE_URL manually.`);
    process.exit(1);
  }
  for (const line of contents.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const USER_EMAIL = 'tostig.meadbrewer@gmail.com';
const HARD = process.argv.includes('--hard');
const PDT_OFFSET = 7; // America/Los_Angeles = UTC-7 (PDT). MySQL re-interprets; see note.

// ── Today, as a PDT calendar date ─────────────────────────────────────────────
const todayPDT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const [year, month, day] = todayPDT.split('-').map(Number);
const todayBase = Date.UTC(year, month - 1, day, 0, 0, 0);
const todayLabel = new Date(todayBase).toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles',
});

/** Build a Date so the browser (PDT) displays `hour:minute`. See create-tomorrow-anchors.js. */
function localTime(hour, minute = 0) {
  return new Date(todayBase + (hour + PDT_OFFSET) * 3_600_000 + minute * 60_000);
}

// ── The fresh seed set ────────────────────────────────────────────────────────
const ANCHORS = [
  { title: 'Teams stand-up',      rawText: 'Teams stand-up at 9:30 AM',       at: localTime(9, 30), mins: 30, level: 'cant_miss' },
  { title: 'Product sync',        rawText: 'Product sync at 1:00 PM',         at: localTime(13, 0), mins: 60, level: 'cant_miss' },
  { title: '1-on-1 with manager', rawText: '1-on-1 with manager at 4:00 PM',  at: localTime(16, 0), mins: 30, level: 'high' },
];

const FLEX = [
  { rawText: 'Prepare agenda for morning stand-up', level: 'high' },
  { rawText: 'Update project notes after team sync', level: 'high' },
  { rawText: 'Block 30 min for focused deep work',   level: 'med', mins: 30 },
  { rawText: 'Review and respond to emails',          level: 'med' },
  { rawText: 'Tidy up the task backlog',              level: 'low' },
  { rawText: 'Check in with team on Slack',           level: 'low' },
];

async function main() {
  const user = await db.user.findUnique({ where: { email: USER_EMAIL }, select: { id: true } });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);
  const userId = user.id;

  console.log(`Morning reset for ${todayLabel}${HARD ? ' (HARD)' : ''}\n`);

  // ── 1. Clear plans ──────────────────────────────────────────────────────────
  const plans = await db.dailyPlan.findMany({
    where: HARD ? { userId } : { userId, planDate: new Date(todayBase) },
    select: { id: true },
  });
  const planIds = plans.map((p) => p.id);
  if (planIds.length > 0) {
    await db.dailyPlanItem.deleteMany({ where: { dailyPlanId: { in: planIds } } });
    await db.dailyPlan.deleteMany({ where: { id: { in: planIds } } });
  }
  console.log(`  ✓ Cleared ${planIds.length} plan(s) + their items`);

  // ── 2. Clear tasks ──────────────────────────────────────────────────────────
  const taskWhere = HARD ? { userId } : { userId, status: { in: ['active', 'deferred'] } };
  const oldTasks = await db.task.findMany({ where: taskWhere, select: { id: true } });
  const oldTaskIds = oldTasks.map((t) => t.id);
  if (oldTaskIds.length > 0) {
    await db.taskStep.deleteMany({ where: { taskId: { in: oldTaskIds } } }).catch(() => {});
    await db.task.deleteMany({ where: { id: { in: oldTaskIds } } });
  }
  console.log(`  ✓ Deleted ${oldTaskIds.length} ${HARD ? '' : 'active/deferred '}task(s)`);

  if (HARD) {
    const { count } = await db.event.deleteMany({ where: { userId } });
    console.log(`  ✓ Deleted ${count} event(s)`);
  }

  // ── 3. Seed fresh ───────────────────────────────────────────────────────────
  console.log('');
  for (const a of ANCHORS) {
    const t = await db.task.create({
      data: {
        userId, rawText: a.rawText, title: a.title,
        priorityKind: 'anchor', priorityLevel: a.level,
        scheduledFor: a.at, estimatedMinutes: a.mins,
        status: 'active', captureMethod: 'system',
      },
      select: { scheduledFor: true },
    });
    const time = t.scheduledFor.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit',
    });
    console.log(`  📌 ${a.title.padEnd(22)} ${time}`);
  }
  for (const f of FLEX) {
    await db.task.create({
      data: {
        userId, rawText: f.rawText,
        priorityKind: 'flexible', priorityLevel: f.level,
        estimatedMinutes: f.mins ?? null,
        status: 'active', captureMethod: 'system',
      },
    });
    const badge = { high: 'Gold  ', med: 'Silver', low: 'Bronze' }[f.level];
    console.log(`  •  ${badge}  ${f.rawText}`);
  }

  console.log(`\n✓ Done. Reload http://localhost:3000/dashboard for a fresh plan.`);
  console.log(`  (3 anchors in the schedule strip, 3 flexible cards bubbled up.)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
