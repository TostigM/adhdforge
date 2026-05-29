/**
 * NextAuth type augmentation
 * Adds id, accountState, and tier to the session user object
 * so pages can read them without an extra DB round-trip.
 */
import type { UserAccountState, UserTier } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accountState: UserAccountState;
      tier: UserTier;
    };
  }
}
