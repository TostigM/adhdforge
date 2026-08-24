'use client';

/**
 * PraiseSendersClient — invite people who are in your corner (M10).
 * The invite link is shown ONCE, right after creation, with a copy button.
 * Revoking removes the sender AND deletes their memos (stated plainly first).
 */

import React, { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@focus-forge/ui';

import { createPraiseInviteAction } from '@/server-actions/praise/create-invite';
import { revokePraiseContactAction } from '@/server-actions/praise/revoke-contact';

export type SerializedContact = {
  id: string;
  displayName: string;
  memosRemaining: number;
  memoCount: number;
  inviteActive: boolean;
  inviteExpiresAtIso: string;
};

export function PraiseSendersClient({
  contacts,
  contactLimit,
}: {
  contacts: SerializedContact[];
  /** null = unlimited (Pro). */
  contactLimit: number | null;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [freshInvite, setFreshInvite] = useState<{ name: string; url: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<SerializedContact | null>(null);

  const atLimit = contactLimit !== null && contacts.length >= contactLimit;

  const createInvite = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const displayName = name.trim();
      if (!displayName) return;
      startTransition(async () => {
        const result = await createPraiseInviteAction(displayName);
        if (!result.ok) {
          addToast({ message: result.message ?? 'That didn’t save. Try again?', type: 'info' });
          return;
        }
        setName('');
        setFreshInvite({ name: displayName, url: result.inviteUrl });
        router.refresh();
      });
    },
    [name, router, addToast],
  );

  const copyLink = useCallback(async () => {
    if (!freshInvite) return;
    try {
      await navigator.clipboard.writeText(freshInvite.url);
      addToast({ message: 'Link copied. Send it however you like.', type: 'success' });
    } catch {
      addToast({ message: 'Copy didn’t work — select the link text instead.', type: 'info' });
    }
  }, [freshInvite, addToast]);

  const revoke = useCallback(
    (contact: SerializedContact) => {
      startTransition(async () => {
        const result = await revokePraiseContactAction(contact.id);
        setConfirmRevoke(null);
        if (!result.ok) {
          addToast({ message: result.message ?? 'That didn’t work. Try again?', type: 'info' });
          return;
        }
        addToast({ message: `${contact.displayName} removed, memos deleted.`, type: 'success' });
        router.refresh();
      });
    },
    [router, addToast],
  );

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Praise senders</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Invite people whose voices help. Each link lets them record up to 3 memos within 7
          days — no account needed on their side.
        </p>
      </header>

      {/* Create */}
      <form onSubmit={createInvite} className="flex gap-2 mb-2">
        <label htmlFor="sender-name" className="sr-only">
          What do you call this person?
        </label>
        <input
          id="sender-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mom, Sarah from work…"
          maxLength={80}
          disabled={atLimit}
          className="flex-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending || atLimit || name.trim().length === 0}
          className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          Create link
        </button>
      </form>
      {contactLimit !== null && (
        <p className="text-xs text-[var(--text-tertiary)] mb-6">
          {contacts.length} of {contactLimit} senders on the free plan
        </p>
      )}

      {/* One-time link reveal */}
      {freshInvite && (
        <div className="mb-6 rounded-2xl border border-[var(--accent)] bg-[var(--bg-elevated)] p-4 space-y-2">
          <p className="text-sm text-[var(--text-primary)]">
            Link for <span className="font-medium">{freshInvite.name}</span> — shown once, copy it
            now:
          </p>
          <p className="text-xs text-[var(--text-secondary)] break-all select-all">
            {freshInvite.url}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={() => setFreshInvite(null)}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Contacts */}
      {contacts.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-10">
          No senders yet. Think of one person whose voice steadies you.
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-3 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-[var(--text-primary)] font-medium">{c.displayName}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {c.memoCount} memo{c.memoCount === 1 ? '' : 's'} ·{' '}
                  {c.inviteActive
                    ? `link active, ${c.memosRemaining} recording${c.memosRemaining === 1 ? '' : 's'} left`
                    : 'link no longer active'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRevoke(c)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Revoke confirm */}
      {confirmRevoke && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Remove ${confirmRevoke.displayName}`}
        >
          <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-elevated)] p-6 space-y-4">
            <h3 className="font-medium text-[var(--text-primary)]">
              Remove {confirmRevoke.displayName}?
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Their link stops working and their {confirmRevoke.memoCount} memo
              {confirmRevoke.memoCount === 1 ? '' : 's'} will be deleted. This can’t be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                disabled={isPending}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
              >
                Keep them
              </button>
              <button
                type="button"
                onClick={() => revoke(confirmRevoke)}
                disabled={isPending}
                className="rounded-xl bg-fuchsia-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isPending ? 'Removing…' : 'Remove + delete memos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
