'use server';

/**
 * Server Action: Nightly Launchpad Reminder settings (M9.3)
 * ──────────────────────────────────────────────────────────────────────────────
 * Saves the preference AND converges the pending launchpad_nightly alert row in
 * one action, so the setting and the schedule can't drift apart.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { ensureNightlyReminder } from '@focus-forge/domain/launchpad/nightly-reminder';
import { updateUserPreferences } from '@focus-forge/domain/users/update-preferences';

import { requireUser } from '@/lib/require-user';

export type SetNightlyReminderResult =
  | { ok: true; scheduledForIso: string | null }
  | { ok: false; error: string; message?: string };

export async function setNightlyReminderAction(input: {
  enabled: boolean;
  timeLocal: string;
}): Promise<SetNightlyReminderResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const prefResult = await updateUserPreferences(db, auth.userId, {
    launchpadReminderEnabled: input.enabled,
    launchpadReminderTime: input.timeLocal,
  });
  if (!prefResult.ok) {
    return { ok: false, error: prefResult.error, message: prefResult.message };
  }

  const reminder = await ensureNightlyReminder(db, {
    userId: auth.userId,
    enabled: input.enabled,
    timeLocal: input.timeLocal,
  });
  if (!reminder.ok) {
    return { ok: false, error: reminder.error, message: reminder.message };
  }

  revalidatePath('/account');
  revalidatePath('/launchpad');
  return {
    ok: true,
    scheduledForIso: reminder.value.scheduledFor?.toISOString() ?? null,
  };
}
