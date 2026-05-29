/**
 * Grant a user the 'comp' tier — complimentary paid access.
 */
import { notFound } from 'next/navigation';
import { db } from '@focus-forge/database/client';
import { grantCompTier } from '../actions';
import { ActionForm } from '../_components/ActionForm';

export default async function GrantCompPage({
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
    select: { id: true, email: true, name: true, tier: true },
  });
  if (!user) return notFound();

  const action = grantCompTier.bind(null, id);

  return (
    <ActionForm
      title="Grant comp tier"
      description={`Grant ${user.name ?? user.email} complimentary paid access. Current tier: ${user.tier}.`}
      cancelHref={`/admin/users/${id}`}
      submitLabel="Grant comp tier"
      action={action}
      errorMessage={error ? 'Justification is required.' : undefined}
    >
      <div>
        <label htmlFor="compReason" className="block text-sm font-medium text-slate-300 mb-1.5">
          Internal reason <span className="text-slate-500">(for records, not shown to user)</span>
        </label>
        <input
          id="compReason"
          name="compReason"
          type="text"
          placeholder="e.g. Speaker gift, support credit, partner"
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-100 placeholder-slate-500 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="expiresAt" className="block text-sm font-medium text-slate-300 mb-1.5">
          Comp expires <span className="text-slate-500">(leave blank for no expiry)</span>
        </label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="datetime-local"
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                     text-slate-100 text-sm
                     focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </ActionForm>
  );
}
