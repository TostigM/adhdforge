/**
 * Pause a user's account.
 * Sets accountState → 'paused', stores optional reason + expiry.
 */
import { notFound } from 'next/navigation';
import { db } from '@focus-forge/database/client';
import { pauseUser } from '../actions';
import { ActionForm } from '../_components/ActionForm';

export default async function PausePage({
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
  if (user.accountState !== 'active') return notFound(); // Guard: only pause active users

  const action = pauseUser.bind(null, id);

  return (
    <ActionForm
      title="Pause account"
      description={`This will prevent ${user.name ?? user.email} from accessing most features. They can still sign in and read content.`}
      cancelHref={`/admin/users/${id}`}
      submitLabel="Pause account"
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
          placeholder="e.g. Usage review in progress"
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-100 placeholder-slate-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="pausedUntil" className="block text-sm font-medium text-slate-300 mb-1.5">
          Auto-unpause date <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="pausedUntil"
          name="pausedUntil"
          type="datetime-local"
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-100 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </ActionForm>
  );
}
