/**
 * scripts/test-db-connection.ts
 * Validates that DATABASE_URL is set and the database is reachable.
 *
 * Run:    pnpm test:db
 * Needs:  .env.local with DATABASE_URL set
 *         pnpm db:generate already run
 *
 * Common failure modes:
 *   "Access denied for user"  → wrong password, or user not added to DB with ALL PRIVILEGES
 *   "Unknown database"        → DB name mismatch (Bluehost prepends account name: youruser_dbname)
 *   "Connection refused"      → Remote MySQL not enabled in cPanel, or your IP not whitelisted
 *   "SSL connection error"    → append ?sslmode=disable to DATABASE_URL, or configure SSL cert
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('Testing database connection...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1 AS ok`;
    console.log('✅ Connected to MySQL successfully');
    console.log('   Query result:', result);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
