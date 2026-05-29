/**
 * Reusable admin action form.
 * Server component — renders a confirmation form with a required justification
 * textarea and variant-styled submit button.
 *
 * Usage:
 *   <ActionForm title="Pause account" action={pauseUser.bind(null, id)} ...>
 *     {optional extra fields}
 *   </ActionForm>
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

interface ActionFormProps {
  title: string;
  description: string;
  cancelHref: string;
  submitLabel: string;
  submitVariant?: 'default' | 'warning' | 'danger';
  action: (formData: FormData) => void | Promise<void>;
  errorMessage?: string;
  justificationLabel?: string;
  justificationPlaceholder?: string;
  children?: ReactNode;
}

const submitStyles = {
  default: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  warning: 'bg-amber-900/60 hover:bg-amber-900 text-amber-300 border border-amber-700/60',
  // Danger uses fuchsia — never red (Rule 1)
  danger:  'bg-fuchsia-900/60 hover:bg-fuchsia-900 text-fuchsia-300 border border-fuchsia-700/60',
};

export function ActionForm({
  title,
  description,
  cancelHref,
  submitLabel,
  submitVariant = 'default',
  action,
  errorMessage,
  justificationLabel = 'Justification (internal — never shown to user)',
  justificationPlaceholder = 'Why are you taking this action? Be specific.',
  children,
}: ActionFormProps) {
  return (
    <div className="max-w-lg space-y-6">
      {/* Back link */}
      <Link href={cancelHref} className="text-indigo-400 hover:text-indigo-300 text-sm">
        ← Cancel
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
        <p className="mt-2 text-slate-400 text-sm">{description}</p>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-fuchsia-900/40 border border-fuchsia-700/50">
          <p className="text-fuchsia-200 text-sm">{errorMessage}</p>
        </div>
      )}

      <form action={action} className="space-y-4">
        {/* Extra fields injected by parent */}
        {children}

        {/* Justification — always required */}
        <div>
          <label htmlFor="justification" className="block text-sm font-medium text-slate-300 mb-1.5">
            {justificationLabel}
            <span className="text-fuchsia-400 ml-1">*</span>
          </label>
          <textarea
            id="justification"
            name="justification"
            rows={4}
            required
            placeholder={justificationPlaceholder}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl
                       text-slate-100 placeholder-slate-500 text-sm resize-y
                       focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-slate-600 text-xs">
            This is logged permanently and cannot be edited.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                        ${submitStyles[submitVariant]}`}
          >
            {submitLabel}
          </button>
          <Link
            href={cancelHref}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors
                       bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
