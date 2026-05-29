/**
 * Unsuspend a user — restores them to 'active'.
 */
import { notFound } from 'next/navigation';
import { db } from '@focus-forge/database/client';
import { unsuspendUser } from '../actions';
import { ActionForm } from '../_components/ActionForm';

export default async function UnsuspendPage({
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
    select: { id: true, email: true, name: true, accountState: true, suspendedReason: true },
  });
  if (!user) return notFound();
  if (user.accountState !== 'suspended') return notFound();

  const action = unsuspendUser.bind(null, id);

  return (
    <ActionForm
      title="Unsuspend account"
      description={`This will restore ${user.name ?? user.email}'s access.`}
      cancelHref={`/admin/users/${id}`}
      submitLabel="Unsuspend account"
      action={action}
      errorMessage={error ? 'Justification is required.' : undefined}
    >
      {user.suspendedReason && (
        <p className="text-sm text-slate-400">
          Current suspension reason: <span className="text-slate-200">{user.suspendedReason}</span>
        </p>
      )}
    </ActionForm>
  );
}
