/**
 * Soft-delete a user.
 * Sets accountState → 'pending_delete' with a 30-day window before data purge.
 */
import { notFound } from 'next/navigation';
import { db } from '@focus-forge/database/client';
import { softDeleteUser } from '../actions';
import { ActionForm } from '../_components/ActionForm';

export default async function SoftDeletePage({
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
    select: { id: true, email: true, name: true, accountState: true },
  });
  if (!user) return notFound();
  if (user.accountState === 'pending_delete') return notFound();

  const action = softDeleteUser.bind(null, id);

  return (
    <ActionForm
      title="Soft delete account"
      description={`${user.name ?? user.email}'s account will enter a 30-day deletion window. Data will be permanently purged after that unless cancelled.`}
      cancelHref={`/admin/users/${id}`}
      submitLabel="Mark for deletion"
      submitVariant="warning"
      action={action}
      errorMessage={error ? 'Justification is required.' : undefined}
    />
  );
}
