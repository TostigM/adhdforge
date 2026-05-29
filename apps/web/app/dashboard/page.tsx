/**
 * Dashboard — M2 stub.
 * Full feature dashboard comes in M3+.
 * For now: welcome message, quick links, and a "coming soon" placeholder.
 */
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { db } from '@focus-forge/database/client';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin?callbackUrl=/dashboard');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, tier: true },
  });

  const displayName = user?.name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'there';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hey, {displayName} 👋</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Focus Forge is warming up. More features on the way.
            </p>
          </div>
          <Link
            href="/account"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Account →
          </Link>
        </div>

        {/* Coming soon placeholder */}
        <div className="bg-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="text-4xl">🚧</div>
          <h2 className="text-lg font-semibold text-slate-200">
            Your workspace is getting ready
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Tasks, timers, and focus tools are coming in the next milestone.
            You&apos;re in early — thanks for being here.
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/account"
            className="bg-slate-800 hover:bg-slate-700 rounded-xl p-5 transition-colors group"
          >
            <div className="text-indigo-400 text-xl mb-2">⚙️</div>
            <div className="text-sm font-medium text-slate-200 group-hover:text-white">
              Account settings
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Manage your profile and plan
            </div>
          </Link>

          <div className="bg-slate-800 rounded-xl p-5 opacity-50 cursor-not-allowed">
            <div className="text-indigo-400 text-xl mb-2">✅</div>
            <div className="text-sm font-medium text-slate-200">Tasks</div>
            <div className="text-xs text-slate-500 mt-0.5">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
