'use server';

/**
 * Server actions: resolve a content report (M10, doc 06 §10.6).
 * Both resolutions require written notes; removal also requires the standard
 * justification discipline. Audit row + resolution commit atomically.
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { db } from '@focus-forge/database/client';
import { logAdminAction } from '@focus-forge/domain/admin/audit';
import { getAdminPermissions } from '@focus-forge/domain/admin/permissions';
import { resolveReport } from '@focus-forge/domain/praise/admin-review';

import { authOptions } from '@/lib/auth';
import { deletePraiseAudio } from '@/lib/r2';

async function requireModerator(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin');
  const perms = await getAdminPermissions(db, session.user.id);
  if (!perms.includes('admin_content_moderate')) redirect('/admin');
  return session.user.id;
}

export async function resolveReportAction(reportId: string, formData: FormData) {
  const adminId = await requireModerator();

  const resolution = formData.get('resolution')?.toString();
  const notes = formData.get('notes')?.toString()?.trim() ?? '';

  if (
    (resolution !== 'resolved_no_action' && resolution !== 'resolved_action_taken') ||
    !notes
  ) {
    redirect(`/admin/reports/${reportId}?error=1`);
  }

  const result = await resolveReport(db, {
    reportId,
    adminUserId: adminId,
    resolution,
    reviewNotes: notes,
    actionTaken: resolution === 'resolved_action_taken' ? 'memo_removed' : undefined,
  });
  if (!result.ok) {
    redirect(`/admin/reports/${reportId}?error=1`);
  }

  await logAdminAction({
    db,
    adminUserId: adminId,
    action: resolution === 'resolved_action_taken' ? 'content.remove_memo' : 'content.restore_memo',
    justification: notes,
    metadata: { reportId, resolution },
  });

  if (result.value.removedAudioPath) {
    await deletePraiseAudio([result.value.removedAudioPath]);
  }

  redirect('/admin/reports?resolved=1');
}
