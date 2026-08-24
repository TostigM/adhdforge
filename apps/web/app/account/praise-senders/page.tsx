/**
 * /account/praise-senders — manage praise invite links (M10, doc 01 §10).
 */

import Link from 'next/link';

import { db } from '@focus-forge/database/client';
import { listTrustedContacts } from '@focus-forge/domain/praise/list-contacts';
import { FREE_TRUSTED_CONTACT_LIMIT } from '@focus-forge/domain/praise/create-invite';

import { requirePageUser } from '@/lib/require-user';
import { PraiseSendersClient } from './_components/PraiseSendersClient';

const PRO_TIERS = new Set(['comp', 'paid', 'paid_lifetime']);

export default async function PraiseSendersPage() {
  const { userId } = await requirePageUser('/account/praise-senders');

  const [user, contacts] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { tier: true } }),
    listTrustedContacts(db, userId),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        aria-label="Praise senders navigation"
      >
        <Link
          href="/praise"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to praise
        </Link>
        <Link
          href="/account"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Account →
        </Link>
      </nav>

      {contacts.ok ? (
        <PraiseSendersClient
          contacts={contacts.value.map((c) => ({
            id: c.id,
            displayName: c.displayName,
            memosRemaining: c.memosRemaining,
            memoCount: c.memoCount,
            inviteActive: c.inviteActive,
            inviteExpiresAtIso: c.inviteExpiresAt.toISOString(),
          }))}
          contactLimit={PRO_TIERS.has(user?.tier ?? 'free') ? null : FREE_TRUSTED_CONTACT_LIMIT}
        />
      ) : (
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-[var(--text-secondary)]">
            Your senders didn’t load just now. A refresh usually sorts it out.
          </p>
        </main>
      )}
    </div>
  );
}
