/**
 * create-tomorrow-anchors.js
 * Seed anchor tasks for tomorrow for manual smoke testing.
 *
 * ── TIMEZONE MATH ────────────────────────────────────────────────────────────
 * Bluehost MySQL is in America/Los_Angeles (PDT = UTC-7). Prisma does a
 * bidirectional conversion:
 *   write: sends value → MySQL adds 7h → stores (value + 7h)
 *   read:  reads stored → Prisma subtracts 7h → returns (stored - 7h)
 *
 * To display "9:30 AM PDT" the browser needs T16:30Z from Prisma.
 * Prisma returns (stored - 7h), so MySQL must store T23:30Z.
 * MySQL stores (sent + 7h), so we must send T16:30Z.
 * T16:30Z = tomorrowBase + (9 + 7) * 3600s  ← include PDT offset in formula.
 *
 * Long-term fix: add &timezone=UTC to DATABASE_URL so MySQL uses UTC
 * and no conversion happens at all.
 *
 * Run:
 *   $env:DATABASE_URL = (Get-Content apps\web\.env.local | ...)
 *   node scripts/create-tomorrow-anchors.js
 */

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();
const USER_EMAIL = 'tostig.meadbrewer@gmail.com';
const PDT_OFFSET = 7; // PDT = UTC-7

// ── Compute tomorrow as a LOCAL PDT calendar date ─────────────────────────────
// Use en-CA format (YYYY-MM-DD) with LA timezone so we always get the correct
// calendar date regardless of what UTC offset the Node.js process is running in.
const todayPDT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const [year, month, day] = todayPDT.split('-').map(Number);

// Midnight UTC of tomorrow's PDT calendar date (not midnight PDT!)
const tomorrowBase = Date.UTC(year, month - 1, day + 1, 0, 0, 0);

const tomorrowLabel = new Date(tomorrowBase).toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles',
});

/** Build the Date to pass to Prisma so that the browser displays `hour:minute AM/PM PDT`. */
function localTime(hour, minute = 0) {
  // Add PDT offset so MySQL round-trip lands at the correct UTC for the browser.
  return new Date(tomorrowBase + (hour + PDT_OFFSET) * 3_600_000 + minute * 60_000);
}

const anchors = [
  {
    rawText: 'Teams stand-up at 9:30 AM',
    title: 'Teams stand-up',
    priorityKind: 'anchor',
    priorityLevel: 'cant_miss',
    scheduledFor: localTime(9, 30),
    estimatedMinutes: 30,
    captureMethod: 'system',
  },
  {
    rawText: 'Product sync at 1:00 PM',
    title: 'Product sync',
    priorityKind: 'anchor',
    priorityLevel: 'cant_miss',
    scheduledFor: localTime(13, 0),
    estimatedMinutes: 60,
    captureMethod: 'system',
  },
  {
    rawText: '1-on-1 with manager at 4:00 PM',
    title: '1-on-1 with manager',
    priorityKind: 'anchor',
    priorityLevel: 'high',
    scheduledFor: localTime(16, 0),
    estimatedMinutes: 30,
    captureMethod: 'system',
  },
];

// IDs of stale tasks from previous runs to clean up
const STALE_IDS = [
  // Second run (sent without +7h offset, stored at wrong times)
  'cmpyurfid0001mx7socc0gvz8',  // Teams stand-up T16:30Z
  'cmpyurfm30003mx7svtculeaf',  // Product sync T20:00Z
  'cmpyurfol0005mx7s4agoekvd',  // 1-on-1 T23:00Z
];

async function main() {
  const user = await db.user.findUnique({
    where: { email: USER_EMAIL },
    select: { id: true },
  });
  if (!user) throw new Error(`User not found: ${USER_EMAIL}`);

  if (STALE_IDS.length > 0) {
    const deleted = await db.task.deleteMany({ where: { id: { in: STALE_IDS } } });
    if (deleted.count > 0) console.log(`Cleaned up ${deleted.count} stale task(s).\n`);
  }

  console.log(`Creating ${anchors.length} anchor tasks for ${tomorrowLabel}:\n`);

  for (const task of anchors) {
    const created = await db.task.create({
      data: { userId: user.id, ...task },
      select: { id: true, rawText: true, scheduledFor: true },
    });

    // Verify: what will Prisma return vs what will the browser show?
    // Prisma returns (stored - 7h). Browser in PDT: returned - 7h.
    // We want browser to show the intended local time.
    const prismaReturned = created.scheduledFor; // what Prisma gives back after read
    const browserPDT = prismaReturned.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit', minute: '2-digit',
    });
    console.log(`  ✓ ${created.rawText}  →  displays as ${browserPDT} PDT`);
  }

  console.log(`\nDone. These tasks will be seeded into tomorrow's plan by seedAnchors()`);
  console.log(`when the plan is created. They will NOT appear in today's plan.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
