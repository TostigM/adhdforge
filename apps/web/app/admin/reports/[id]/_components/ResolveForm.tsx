'use client';

/**
 * ResolveForm — close out a content report (M10).
 * Notes are mandatory for BOTH paths: articulating the call is the point.
 */

import React, { useState } from 'react';

import { resolveReportAction } from '../actions';

export function ResolveForm({ reportId }: { reportId: string }) {
  const [resolution, setResolution] = useState<'resolved_no_action' | 'resolved_action_taken'>(
    'resolved_no_action',
  );

  return (
    <form
      action={resolveReportAction.bind(null, reportId)}
      className="bg-slate-800 rounded-2xl p-6 space-y-4"
    >
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Resolution</h2>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="resolution"
          value="resolved_no_action"
          checked={resolution === 'resolved_no_action'}
          onChange={() => setResolution('resolved_no_action')}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">No action needed</span>
          <span className="block text-slate-400">
            The memo returns to the recipient’s inbox automatically.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="radio"
          name="resolution"
          value="resolved_action_taken"
          checked={resolution === 'resolved_action_taken'}
          onChange={() => setResolution('resolved_action_taken')}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Remove the memo</span>
          <span className="block text-slate-400">
            Deletes the memo and its audio permanently. The report record stays.
          </span>
        </span>
      </label>

      <div>
        <label htmlFor="resolve-notes" className="text-sm text-slate-300">
          Review notes (required)
        </label>
        <textarea
          id="resolve-notes"
          name="notes"
          required
          rows={3}
          className="mt-1 w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100"
          placeholder="What you heard and why this resolution."
        />
      </div>

      <button
        type="submit"
        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white"
      >
        Resolve report
      </button>
    </form>
  );
}
