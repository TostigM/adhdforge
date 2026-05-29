/**
 * Admin — Create a new user account.
 * Accounts created here are pre-verified and active.
 * Optionally sends an invite email with a 7-day sign-in link.
 */
import Link from 'next/link';
import { createUser } from '../actions';

const ERROR_MESSAGES: Record<string, string> = {
  email_required: 'Email address is required.',
  email_invalid:  'That doesn\'t look like a valid email address.',
  email_exists:   'An account with that email already exists.',
};

const TIERS = [
  { value: 'free',          label: 'Free' },
  { value: 'legacy_free',   label: 'Free (Legacy)' },
  { value: 'comp',          label: 'Complimentary (comp)' },
  { value: 'paid',          label: 'Paid' },
  { value: 'paid_lifetime', label: 'Paid — Lifetime' },
];

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.') : undefined;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/admin/users" className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to users
        </Link>
        <h1 className="text-2xl font-bold text-slate-100 mt-2">Create account</h1>
        <p className="text-slate-400 text-sm mt-1">
          The account will be active and email-verified immediately.
          Optionally send the person an invite link to set their password.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-fuchsia-900/40 border border-fuchsia-700/50">
          <p className="text-fuchsia-200 text-sm">{errorMessage}</p>
        </div>
      )}

      <form action={createUser} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Email address <span className="text-fuchsia-400">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="son@example.com"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                       text-slate-100 placeholder-slate-500 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">
            Name <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="off"
            placeholder="e.g. Alex"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                       text-slate-100 placeholder-slate-500 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tier */}
        <div>
          <label htmlFor="tier" className="block text-sm font-medium text-slate-300 mb-1.5">
            Plan / Tier
          </label>
          <select
            id="tier"
            name="tier"
            defaultValue="free"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                       text-slate-300 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="mt-1 text-slate-600 text-xs">
            Comp tier gives full paid access. You can change this later.
          </p>
        </div>

        {/* Send invite */}
        <div className="flex items-start gap-3">
          <input
            id="sendInvite"
            name="sendInvite"
            type="checkbox"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900
                       text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          <div>
            <label htmlFor="sendInvite" className="text-sm font-medium text-slate-300 cursor-pointer">
              Send invite email
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Sends them a link to set their password. Valid for 7 days.
              If email isn&apos;t configured yet, they can use &quot;Forgot password?&quot; to get their own link.
            </p>
          </div>
        </div>

        {/* Internal note */}
        <div>
          <label htmlFor="note" className="block text-sm font-medium text-slate-300 mb-1.5">
            Internal note <span className="text-slate-500">(logged in audit trail)</span>
          </label>
          <input
            id="note"
            name="note"
            type="text"
            placeholder="e.g. Family account for my son"
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl
                       text-slate-100 placeholder-slate-500 text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white
                       rounded-xl text-sm font-medium transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Create account
          </button>
          <Link
            href="/admin/users"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300
                       rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
