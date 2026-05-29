/**
 * Unpause a user's account — restores them to 'active'.
 */
import { notFound } from 'next/navigation';
import { db } from '@focus-forge/database/client';
import { unpauseUser } from '../actions';
import { ActionForm } from '../_components/ActionForm';

export default async function UnpausePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, accountState: true, pausedReason: true, pausedUntil: true },
  });
  if (!user) return notFound();
  if (user.accountState !== 'paused') return notFound();

  const action = unpauseUser.bind(null, id);

  return (
    <ActionForm
      title="Unpause account"
      description={`This will restore ${user.name ?? user.email}'s full access.`}
      cancelHref={`/admin/users/${id}`}
      submitLabel="Unpause account"
      action={action}
      errorMessage={error ? 'Justification is required.' : undefined}
    >
      {user.pausedReason && (
        <p className="text-sm text-slate-400">
          Current pause reason: <span className="text-slate-200">{user.pausedReason}</span>
        </p>
      )}
    </ActionForm>
  );
}
