/**
 * Sign-in page
 * ──────────────────────────────────────────────────────────────────────────────
 * No "Sign Up" vs "Sign In" distinction — the flow handles both seamlessly.
 * New email → creates account. Existing email → signs in.
 * See doc 01 §6 for the UX spec.
 *
 * Design rules (doc 07):
 *   • No red anywhere
 *   • No "wrong password" shame text
 *   • Single-column layout
 *   • Every error has a recovery action
 */
'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

// ─── Error messages (shame-free framing) ─────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin:        'There was a problem connecting to Google. Please try again.',
  OAuthCallback:      'There was a problem connecting to Google. Please try again.',
  OAuthCreateAccount: 'We couldn\'t create your account. Please try a different method.',
  EmailCreateAccount: 'We couldn\'t create your account. Please try again.',
  Callback:           'Something went wrong. Please try again.',
  CredentialsSignin:  'Check your email and password and try again.',
  SessionRequired:    'Please sign in to continue.',
  account_deleted:    'This account has been removed.',
  default:            'Something went wrong. Please try again.',
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const errorCode = searchParams.get('error') ?? '';

  const [mode, setMode] = useState<'magic-link' | 'password'>('magic-link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.default)
    : '';

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setFieldError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setFieldError('');
    await signIn('email', { email, callbackUrl: '/signin/check-email', redirect: true });
    setLoading(false);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setFieldError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setFieldError('');
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (result?.error) {
      setFieldError(ERROR_MESSAGES['CredentialsSignin'] ?? ERROR_MESSAGES['default'] ?? 'Something went wrong.');
    } else if (result?.ok) {
      router.push(callbackUrl);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn('google', { callbackUrl });
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-8 shadow-xl">
      {/* Global error (from URL param) */}
      {errorMessage && (
        <div className="mb-6 p-3 rounded-lg bg-fuchsia-900/40 border border-fuchsia-700/50">
          <p className="text-fuchsia-200 text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3
                     bg-slate-700 hover:bg-slate-600 disabled:opacity-50
                     text-slate-100 rounded-xl font-medium transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Email form */}
        {mode === 'magic-link' ? (
          <form onSubmit={handleMagicLink} className="space-y-3">
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

            {fieldError && (
              <p className="text-fuchsia-300 text-sm">{fieldError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500
                         disabled:opacity-50 text-white rounded-xl font-medium
                         transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {loading ? 'Sending…' : 'Send me a sign-in link'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('password'); setFieldError(''); }}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-200
                         transition-colors py-1"
            >
              I&apos;d rather use a password
            </button>
          </form>
        ) : (
          <form onSubmit={handlePassword} className="space-y-3">
            <div>
              <label htmlFor="email-pw" className="block text-sm font-medium text-slate-300 mb-1.5">
                Your email
              </label>
              <input
                id="email-pw"
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600
                             rounded-xl text-slate-100 placeholder-slate-500
                             focus:outline-none focus:ring-2 focus:ring-indigo-500
                             focus:border-transparent pr-12"
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

            {fieldError && (
              <p className="text-fuchsia-300 text-sm">{fieldError}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500
                         disabled:opacity-50 text-white rounded-xl font-medium
                         transition-colors focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('magic-link'); setFieldError(''); }}
              className="w-full text-center text-sm text-slate-400 hover:text-slate-200
                         transition-colors py-1"
            >
              Send me a sign-in link instead
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        New here? Just enter your email — we&apos;ll create your account automatically.
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

// ─── Icons (inline SVG — no icon library dependency yet) ─────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
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
