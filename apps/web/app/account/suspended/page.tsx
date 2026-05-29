/**
 * Suspended account page.
 * Language is empathetic with a clear appeal path — never sterile. Doc 01 §4.3 + §4.6.
 */
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { db } from '@focus-forge/database/client';

export default async function SuspendedPage() {
  const session = await getServerSession(authOptions);

  // If somehow a non-suspended user lands here, redirect them away
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { accountState: true, suspendedReason: true },
  });

  if (!user || user.accountState !== 'suspended') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
        <h1 className="text-xl font-semibold text-slate-100">Account suspended</h1>

        {user.suspendedReason && (
          <p className="text-slate-400 text-sm leading-relaxed">
            Reason: {user.suspendedReason}
          </p>
        )}

        <p className="text-slate-400 text-sm leading-relaxed">
          If you believe this was a mistake, you can appeal by emailing us.
          We review all appeals and aim to respond within 2 business days.
        </p>

        <a
          href="mailto:support@focusforge.app?subject=Account%20suspension%20appeal"
          className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500
                     text-white rounded-xl font-medium text-sm transition-colors"
        >
          Email us to appeal
        </a>
      </div>
    </div>
  );
}
