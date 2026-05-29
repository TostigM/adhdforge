/**
 * Password reset — token redemption page.
 * GET  /reset-password/[token] → show new-password form (or "link expired")
 * POST is handled by the server action below.
 *
 * Design rules (doc 07):
 *   • No red  → fuchsia for errors
 *   • No "wrong password" shame text
 *   • Expired link shows a recovery action (request a new one)
 */
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don\'t match — please check and try again.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };

      if (data.error === 'token_expired' || data.error === 'token_invalid') {
        setTokenInvalid(true);
      } else if (!data.ok) {
        setError('Something went wrong. Please try again.');
      } else {
        setDone(true);
        setTimeout(() => router.push('/signin'), 3000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (tokenInvalid) {
    return (
      <div className="bg-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-100">Link expired</h1>
        <p className="text-slate-400 text-sm">
          This password reset link has expired or already been used.
          Reset links are valid for 1 hour.
        </p>
        <Link
          href="/reset-password"
          className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500
                     text-white rounded-xl text-sm font-medium transition-colors"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <h1 className="text-xl font-semibold text-slate-100">Password updated</h1>
        <p className="text-slate-400 text-sm">
          Your password has been changed. Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Set a new password</h1>
        <p className="text-slate-400 text-sm mt-1">Choose something you&apos;ll remember.</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-fuchsia-900/40 border border-fuchsia-700/50">
          <p className="text-fuchsia-200 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600
                         rounded-xl text-slate-100 placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500
                         focus:border-transparent pr-12"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                         hover:text-slate-200 transition-colors p-1"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
            Confirm new password
          </label>
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600
                       rounded-xl text-slate-100 placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent"
            placeholder="Same password again"
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
          {loading ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
