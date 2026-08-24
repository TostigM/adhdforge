/**
 * /admin/reports/[id] — review one reported memo (M10, doc 06 §10.6).
 * ──────────────────────────────────────────────────────────────────────────────
 * Loading this page IS a content access: it opens the memo via the report
 * (moving pending_review → reviewing), generates a fresh 30-minute signed URL,
 * and writes an admin_actions row with action='content.review_memo' — every
 * access, every time. No persistent admin access to praise audio exists.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { db } from '@focus-forge/database/client';
import { logAdminAction } from '@focus-forge/domain/admin/audit';
import { getAdminPermissions } from '@focus-forge/domain/admin/permissions';
import { getReportForReview } from '@focus-forge/domain/praise/admin-review';

import { authOptions } from '@/lib/auth';
import { getReviewUrl, REVIEW_URL_TTL_SECONDS } from '@/lib/r2';
import { ResolveForm } from './_components/ResolveForm';

export default async function AdminReportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();
  const perms = await getAdminPermissions(db, session.user.id);
  if (!perms.includes('admin_content_moderate')) notFound();

  const { id } = await params;
  const access = await getReportForReview(db, { reportId: id, adminUserId: session.user.id });
  if (!access.ok) notFound();

  // Audit the access BEFORE handing over the signed URL.
  await logAdminAction({
    db,
    adminUserId: session.user.id,
    action: 'content.review_memo',
    justification: `Reviewing content report ${access.value.reportId}.`,
    metadata: { reportId: access.value.reportId, memoId: access.value.memoId },
  });

  const audioUrl = await getReviewUrl(access.value.audioPath);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-slate-100">
      <Link href="/admin/reports" className="text-indigo-400 hover:text-indigo-300 text-sm">
        ← Report queue
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Review report</h1>

      <section className="bg-slate-800 rounded-2xl p-6 space-y-3 mb-6">
        <p>
          <span className="text-slate-400 text-sm">Reason:</span>{' '}
          <span className="font-medium">{access.value.reasonCategory}</span>
        </p>
        {access.value.reasonDetails && (
          <p className="text-sm text-slate-300">{access.value.reasonDetails}</p>
        )}
        <p className="text-sm text-slate-400">
          Memo from “{access.value.senderDisplayName}” ·{' '}
          {Math.round(access.value.audioDurationMs / 1000)}s
        </p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- moderation audio has no transcript */}
        <audio controls src={audioUrl} className="w-full" />
        <p className="text-xs text-slate-500">
          This link expires in {REVIEW_URL_TTL_SECONDS / 60} minutes and this access has been
          audit-logged.
        </p>
      </section>

      <ResolveForm reportId={access.value.reportId} />
    </div>
  );
}
