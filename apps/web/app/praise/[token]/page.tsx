/**
 * /praise/[token] — the PUBLIC sender page (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * No account, no email collected. The invite token is the credential; an
 * inactive link gets one calm message with no reason leaked. The privacy fine
 * print is honest about exactly what is kept (doc 01 §10.2 as amended by D4).
 */

import { db } from '@focus-forge/database/client';
import { verifyPraiseInvite } from '@focus-forge/domain/praise/verify-invite';

import { PraiseSenderClient } from './_components/PraiseSenderClient';

export default async function PraiseSenderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await verifyPraiseInvite(db, token);

  if (!invite.ok) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-4" aria-hidden="true">
            💌
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            This link isn’t active
          </h1>
          <p className="text-[var(--text-secondary)]">{invite.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-page)]">
      <PraiseSenderClient
        token={token}
        displayName={invite.value.displayName}
        memosRemaining={invite.value.memosRemaining}
      />
    </main>
  );
}
