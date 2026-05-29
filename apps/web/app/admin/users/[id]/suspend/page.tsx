/**
 * Suspend a user's account.
 * Suspended users can only receive transactional emails.
 */
import { notFound } from 'next/navigation';
import { db } from '@focus-forge/database/client';
import { suspendUser } from '../actions';
import { ActionForm } from '../_components/ActionForm';

export default async function SuspendPage({
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
  if (user.accountState === 'suspended') return notFound();

  const action = suspendUser.bind(null, id);

  return (
    <ActionForm
      title="Suspend account"
      description={`${user.name ?? user.email} will lose access to Focus Forge. This action is logged and reversible.`}
      cancelHref={`/admin/users/${id}`}
      submitLabel="Suspend account"
      submitVariant="warning"
      action={action}
      errorMessage={error ? 'Justification is required.' : undefined}
    >
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-slate-300 mb-1.5">
          Reason shown to user <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="reason"
          name="reason"
          type="text"
          placeholder="e.g. Terms of service violation"
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-100 placeholder-slate-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </ActionForm>
  );
}
