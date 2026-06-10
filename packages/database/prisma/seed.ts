// packages/database/prisma/seed.ts
// Badge seed data — per 04-mysql-schema.md §8
// Run: npx prisma db seed --schema ./prisma/schema.prisma
import { PrismaClient, BadgeTier } from '@prisma/client';

const prisma = new PrismaClient();

const BADGES: Array<{
  badgeKey: string;
  displayName: string;
  description: string;
  tier: BadgeTier;
  triggerEventType: string;
  triggerThreshold: number;
  isRepeatable: boolean;
  iconName: string;
}> = [
  {
    badgeKey: 'first_capture',
    displayName: 'First Capture',
    description: 'You trusted the app with a thought.',
    tier: 'bronze',
    triggerEventType: 'task.created',
    triggerThreshold: 1,
    isRepeatable: false,
    iconName: 'Sparkles',
  },
  {
    badgeKey: 'first_step',
    displayName: 'First Step',
    description: 'You moved forward.',
    tier: 'bronze',
    triggerEventType: 'task_step.completed',
    triggerThreshold: 1,
    isRepeatable: false,
    iconName: 'Footprints',
  },
  {
    badgeKey: 'first_focus',
    displayName: 'First Focus',
    description: 'You started a timer.',
    tier: 'bronze',
    triggerEventType: 'focus_session.started',
    triggerThreshold: 1,
    isRepeatable: false,
    iconName: 'Timer',
  },
  {
    badgeKey: 'first_complete',
    displayName: 'First Complete',
    description: 'You finished something.',
    tier: 'silver',
    triggerEventType: 'task.completed',
    triggerThreshold: 1,
    isRepeatable: false,
    iconName: 'Check',
  },
  {
    badgeKey: 'daily_capture',
    displayName: 'Daily Capture',
    description: 'Captured a thought today.',
    tier: 'bronze',
    triggerEventType: 'task.created',
    triggerThreshold: 1,
    isRepeatable: true,
    iconName: 'Sparkles',
  },
  {
    badgeKey: 'focus_complete',
    displayName: 'Focus Complete',
    description: 'Made it through a full timer.',
    tier: 'silver',
    triggerEventType: 'focus_session.completed',
    triggerThreshold: 1,
    isRepeatable: true,
    iconName: 'Timer',
  },
  {
    badgeKey: 'praise_listen',
    displayName: 'Praise Listened',
    description: 'Listened to encouragement.',
    tier: 'bronze',
    triggerEventType: 'praise_memo.played',
    triggerThreshold: 1,
    isRepeatable: true,
    iconName: 'Heart',
  },
  {
    badgeKey: 'doorknob_made',
    displayName: 'On Time',
    description: 'Made it out the door.',
    tier: 'gold',
    triggerEventType: 'doorknob.completed',
    triggerThreshold: 1,
    isRepeatable: true,
    iconName: 'DoorOpen',
  },
  {
    badgeKey: 'check_in_yes',
    displayName: 'Body Listening',
    description: 'You checked in with yourself.',
    tier: 'bronze',
    triggerEventType: 'check_in.responded',
    triggerThreshold: 1,
    isRepeatable: true,
    iconName: 'HeartHandshake',
  },
  {
    badgeKey: 'hydrated',
    displayName: 'Hydrated',
    description: 'You drank all your water today.',
    tier: 'silver',
    triggerEventType: 'nourishment.water_goal_met',
    triggerThreshold: 1,
    isRepeatable: true,
    iconName: 'GlassWater',
  },
  {
    badgeKey: 'well_fed',
    displayName: 'Well Fed Body and Mind',
    description: 'You had all your meals today.',
    tier: 'silver',
    triggerEventType: 'nourishment.meal_goal_met',
    triggerThreshold: 1,
    isRepeatable: true,
    iconName: 'Drumstick',
  },
  {
    badgeKey: 'supporter',
    displayName: 'Supporter',
    description: 'Thank you for supporting Focus Forge.',
    tier: 'gold',
    triggerEventType: 'donation.received',
    triggerThreshold: 1,
    isRepeatable: false,
    iconName: 'Sparkles',
  },
];

async function main() {
  console.log('Seeding badges...');
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { badgeKey: badge.badgeKey },
      create: badge,
      update: badge,
    });
    console.log(`  ✓ ${badge.badgeKey}`);
  }
  console.log(`Done — ${BADGES.length} badges seeded.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
