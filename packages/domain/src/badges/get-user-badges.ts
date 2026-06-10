/**
 * get-user-badges.ts — Fetch recently earned badges for a user
 * See 04-mysql-schema.md §7.2
 */

import type { BadgeTier, PrismaClient } from '@prisma/client';

export type UserBadgeItem = {
  userBadgeId: string;
  badgeKey: string;
  displayName: string;
  description: string;
  tier: BadgeTier;
  iconName: string;
  earnedAt: Date;
  context: Record<string, unknown> | null;
};

export async function getUserBadges(
  db: PrismaClient,
  userId: string,
  limit = 20,
): Promise<UserBadgeItem[]> {
  const rows = await db.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      earnedAt: true,
      context: true,
      badge: {
        select: {
          badgeKey: true,
          displayName: true,
          description: true,
          tier: true,
          iconName: true,
        },
      },
    },
  });

  return rows.map((r) => ({
    userBadgeId: r.id,
    badgeKey: r.badge.badgeKey,
    displayName: r.badge.displayName,
    description: r.badge.description,
    tier: r.badge.tier,
    iconName: r.badge.iconName,
    earnedAt: r.earnedAt,
    context: (r.context as Record<string, unknown> | null) ?? null,
  }));
}
