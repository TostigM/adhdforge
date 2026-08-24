/**
 * /praise — the recipient's memo inbox (M10).
 * Server component: loads the inbox (open reports already excluded by query)
 * and the tier for the Pro transcript gate.
 */

import Link from 'next/link';

import { db } from '@focus-forge/database/client';
import { getPraiseInbox } from '@focus-forge/domain/praise/list-inbox';

import { requirePageUser } from '@/lib/require-user';
import { PraiseInboxClient, type SerializedMemo } from './_components/PraiseInboxClient';

const PRO_TIERS = new Set(['comp', 'paid', 'paid_lifetime']);

export default async function PraiseInboxPage() {
  const { userId } = await requirePageUser('/praise');

  const [user, inbox] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { tier: true } }),
    getPraiseInbox(db, userId),
  ]);

  const serialize = (m: {
    id: string;
    senderDisplayName: string;
    audioDurationMs: number;
    transcript: string | null;
    transcriptStatus: string;
    category: string | null;
    playCount: number;
    createdAt: Date;
  }): SerializedMemo => ({
    id: m.id,
    senderDisplayName: m.senderDisplayName,
    audioDurationMs: m.audioDurationMs,
    transcript: m.transcript,
    transcriptStatus: m.transcriptStatus,
    category: m.category,
    playCount: m.playCount,
    createdAtIso: m.createdAt.toISOString(),
  });

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        aria-label="Praise navigation"
      >
        <Link
          href="/dashboard"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to today
        </Link>
        <Link
          href="/account/praise-senders"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Manage senders →
        </Link>
      </nav>

      {inbox.ok ? (
        <PraiseInboxClient
          memos={inbox.value.memos.map(serialize)}
          archived={inbox.value.archived.map(serialize)}
          hiddenByReportCount={inbox.value.hiddenByReportCount}
          isPro={PRO_TIERS.has(user?.tier ?? 'free')}
        />
      ) : (
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-[var(--text-secondary)]">
            Your memos didn’t load just now. A refresh usually sorts it out.
          </p>
        </main>
      )}
    </div>
  );
}
