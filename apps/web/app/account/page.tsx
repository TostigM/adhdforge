/**
 * Account settings — M2 minimal version.
 * Shows: display name, email, tier, account state, sign-out button.
 * Full settings (notifications, data export, password change) come in a later milestone.
 * See doc 01 §6 for UX spec.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { db } from '@focus-forge/database/client';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';
import { requirePageUser } from '@/lib/require-user';
import { TodaySettingsClient } from './_components/TodaySettingsClient';
import { TimerSettingsClient } from './_components/TimerSettingsClient';
import { LaunchpadSettingsClient } from './_components/LaunchpadSettingsClient';

export default async function AccountPage() {
  const { userId } = await requirePageUser('/account');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      accountState: true,
      emailVerified: true,
      createdAt: true,
      preferences: true,
    },
  });

  if (!user) redirect('/signin');

  const displayTier: Record<string, string> = {
    free:          'Free',
    legacy_free:   'Free (Legacy)',
    comp:          'Complimentary',
    paid:          'Paid',
    paid_lifetime: 'Lifetime',
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
        <div>
          <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Account</h1>
        </div>

        {/* Profile */}
        <section className="bg-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Profile</h2>

          <div className="space-y-3">
            <Row label="Name">
              <span className="text-slate-200">{user.name ?? <span className="text-slate-500 italic">Not set</span>}</span>
            </Row>
            <Row label="Email">
              <span className="text-slate-200">{user.email}</span>
              {!user.emailVerified && (
                <span className="ml-2 text-xs text-amber-400">(unverified)</span>
              )}
            </Row>
            <Row label="Member since">
              <span className="text-slate-400 text-sm">{user.createdAt.toLocaleDateString()}</span>
            </Row>
          </div>
        </section>

        {/* Plan */}
        <section className="bg-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Plan</h2>
          <Row label="Current plan">
            <span className="text-slate-200 font-medium">
              {displayTier[user.tier] ?? user.tier}
            </span>
          </Row>
          {user.tier === 'free' && (
            <p className="text-slate-500 text-sm">
              Upgrade options will be available in a future update.
            </p>
          )}
        </section>

        {/* Today settings */}
        <TodaySettingsClient initial={parsePreferences(user.preferences)} />

        {/* Timer settings */}
        <TimerSettingsClient
          initialSoundEnabled={parsePreferences(user.preferences).soundEnabled}
          initialHapticsEnabled={parsePreferences(user.preferences).hapticsEnabled}
        />

        {/* Launchpad settings (M9.3 nightly reminder) */}
        <LaunchpadSettingsClient
          initialEnabled={parsePreferences(user.preferences).launchpadReminderEnabled}
          initialTime={parsePreferences(user.preferences).launchpadReminderTime}
        />

        {/* Sign out */}
        <section className="bg-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Session</h2>
          <p className="text-slate-400 text-sm">
            Signing out will end your current session on this device.
          </p>
          {/* Next.js App Router sign-out — must use a form POST to /api/auth/signout */}
          <form action="/api/auth/signout" method="POST">
            <input type="hidden" name="callbackUrl" value="/signin" />
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200
                         rounded-xl text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </form>
        </section>

        <p className="text-center text-slate-600 text-xs">
          Need to delete your account? Contact support.
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
