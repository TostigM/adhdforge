/**
 * Password reset — "Reset password", never "Recover account".
 * See doc 01 §7.
 * Phase 1: request form. The token link is handled by /reset-password/[token].
 */
'use client';

import { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // Always show the same message — don't leak account existence
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="bg-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <div className="text-4xl">📬</div>
        <h2 className="text-xl font-semibold text-slate-100">Check your email</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          If an account exists for that email, we sent a password reset link.
          It expires in 60 minutes.
        </p>
        <a
          href="/signin"
          className="inline-block text-sm text-indigo-400 hover:text-indigo-300 underline"
        >
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-8 shadow-xl">
      <h2 className="text-xl font-semibold text-slate-100 mb-2">Reset password</h2>
      <p className="text-slate-400 text-sm mb-6">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
            Your email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600
                       rounded-xl text-slate-100 placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500
                     disabled:opacity-50 text-white rounded-xl font-medium
                     transition-colors focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <a href="/signin" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
          Back to sign in
        </a>
      </div>
    </div>
  );
}
