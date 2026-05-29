import { PrismaClient } from '@prisma/client';

// Prevent multiple PrismaClient instances during Next.js hot reload in development.
// In production, a single instance is created and reused.
// See: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient();

/** Alias — use `db` throughout the app for brevity. */
export const db = prisma;

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = prisma;
}

export { PrismaClient };
