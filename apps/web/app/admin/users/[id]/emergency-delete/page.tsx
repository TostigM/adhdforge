/**
 * Emergency delete — immediate permanent data removal.
 * Requires 100+ character justification.
 * Use only in compliance/legal emergency scenarios.
 */
import { notFound } from 'next/navigation';
import { db } from '@focus-forge/database/client';
import { emergencyDeleteUser } from '../actions';
import { ActionForm } from '../_components/ActionForm';

export default async function EmergencyDeletePage({
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
    select: { id: true, email: true, name: true },
  });
  if (!user) return notFound();

  const action = emergencyDeleteUser.bind(null, id);

  const errorMessage = error
    ? 'Justification must be at least 100 characters describing the emergency.'
    : undefined;

  return (
    <ActionForm
      title="Emergency delete"
      description={`This will IMMEDIATELY and PERMANENTLY delete all data for ${user.name ?? user.email}. This cannot be undone. The audit trail is preserved.`}
      cancelHref={`/admin/users/${id}`}
      submitLabel="Permanently delete"
      submitVariant="danger"
      action={action}
      errorMessage={errorMessage}
      justificationLabel="Justification (minimum 100 characters)"
      justificationPlaceholder="Describe the legal or compliance emergency requiring immediate data deletion…"
    />
  );
}
