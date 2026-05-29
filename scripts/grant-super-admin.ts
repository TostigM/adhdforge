/**
 * Grant Super-Admin Permissions
 * ──────────────────────────────────────────────────────────────────────────────
 * Usage: pnpm tsx --env-file .env.local scripts/grant-super-admin.ts --email you@example.com
 *
 * Inserts feature_grant rows for ALL 12 admin permissions.
 * Idempotent — skips any permission already granted.
 * CRITICAL: This script can ONLY be run from the CLI. It is NOT exposed via HTTP.
 * See M2 task 2.10 and AGENTS.md §5.7.
 */

import { PrismaClient } from '@prisma/client';
import { ADMIN_PERMISSIONS } from '../packages/domain/src/admin/permissions';

const db = new PrismaClient();

async function main() {
  const emailArg = process.argv.find((a) => a.startsWith('--email='))?.split('=')[1]
    ?? process.argv[process.argv.indexOf('--email') + 1];

  if (!emailArg) {
    console.error('❌ Usage: pnpm tsx --env-file .env.local scripts/grant-super-admin.ts --email you@example.com');
    process.exit(1);
  }

  const email = emailArg.toLowerCase().trim();
  console.log(`\nLooking up user: ${email}`);

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, accountState: true },
  });

  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    console.error('   Make sure the user has signed up first.');
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.name ?? user.email} (id: ${user.id})`);
  console.log(`   Account state: ${user.accountState}`);
  console.log('\nGranting admin permissions...\n');

  let granted = 0;
  let skipped = 0;

  for (const permission of ADMIN_PERMISSIONS) {
    const existing = await db.featureGrant.findFirst({
      where: {
        userId: user.id,
        featureKey: permission,
        revokedAt: null,
      },
    });

    if (existing) {
      console.log(`  ⏭  ${permission} (already granted)`);
      skipped++;
      continue;
    }

    await db.featureGrant.create({
      data: {
        userId: user.id,
        featureKey: permission,
        grantedByAdminId: user.id, // Self-grant (bootstrap only)
      },
    });

    // Log to admin_actions so the bootstrap is auditable
    await db.adminAction.create({
      data: {
        adminUserId: user.id,
        targetUserId: user.id,
        action: 'grant_admin',
        justification: `Bootstrap: granted ${permission} via grant-super-admin.ts CLI script`,
        metadata: { permission, bootstrap: true },
      },
    });

    console.log(`  ✅ ${permission}`);
    granted++;
  }

  console.log(`\n✅ Done. Granted: ${granted}, Already had: ${skipped}`);
  console.log(`\n${email} now has all 12 admin permissions.`);
  console.log('Sign in and visit /admin to verify.\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Script failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
