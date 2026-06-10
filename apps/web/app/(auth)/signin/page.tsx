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
import { Button, Card, Input } from '@focus-forge/ui';

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
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.default)
    : '';

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) { setFieldError('Please enter your email address.'); return; }
    setLoading(true);
    setFieldError('');
    await signIn('email', { email, callbackUrl: '/signin/check-email', redirect: true });
    setLoading(false);
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) { setFieldError('Please enter your email and password.'); return; }
    setLoading(true);
    setFieldError('');
    const result = await signIn('credentials', { email, password, redirect: false, callbackUrl });
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
    <Card padding="lg" elevated>
      {/* Global error */}
      {errorMessage && (
        <div className="mb-6 p-3 rounded-lg bg-fuchsia-900/40 border border-fuchsia-700/50">
          <p className="text-fuchsia-200 text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Google sign-in */}
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleGoogle}
          disabled={loading}
          leftIcon={<GoogleIcon />}
        >
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-text-tertiary text-xs uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* Email form */}
        {mode === 'magic-link' ? (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <Input
              id="email"
              label="Your email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              error={fieldError || undefined}
            />

            <Button type="submit" loading={loading} className="w-full">
              Send me a sign-in link
            </Button>

            <button
              type="button"
              onClick={() => { setMode('password'); setFieldError(''); }}
              className="w-full text-center text-sm text-text-secondary hover:text-text-primary
                         transition-colors py-1 focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-accent rounded"
            >
              I&apos;d rather use a password
            </button>
          </form>
        ) : (
          <form onSubmit={handlePassword} className="space-y-3">
            <Input
              id="email-pw"
              label="Your email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldError || undefined}
              labelAction={
                <Link
                  href="/reset-password"
                  className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              }
            />

            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>

            <button
              type="button"
              onClick={() => { setMode('magic-link'); setFieldError(''); }}
              className="w-full text-center text-sm text-text-secondary hover:text-text-primary
                         transition-colors py-1 focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-accent rounded"
            >
              Send me a sign-in link instead
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-text-tertiary">
        New here? Just enter your email — we&apos;ll create your account automatically.
      </p>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

// ─── Google icon ──────────────────────────────────────────────────────────────

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
