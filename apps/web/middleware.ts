/**
 * Next.js Middleware — Auth + Account State Guards
 * ──────────────────────────────────────────────────────────────────────────────
 * Runs on every request. Handles:
 *   1. Protecting /dashboard and /account routes (redirect to /signin if not authed)
 *   2. Blocking suspended users from accessing the app
 *   3. Hiding /admin routes (404 for non-admins — never 403, see doc 07)
 *
 * NOTE: Middleware runs on the Edge runtime — Prisma is NOT available here.
 * Account state is read from the session cookie (populated by the session callback
 * in lib/auth.ts). For the admin check we do a lightweight token check only;
 * the full permission check happens in the admin layout server component.
 */

import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /admin routes ──────────────────────────────────────────────────────────
  // Return 404 for unauthenticated users. The full permission check happens
  // in the admin layout, but we catch the unauthenticated case here for speed.
  // See anti-pattern in doc 07: "return 403 Forbidden when non-admins access /admin"
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }
    // Actual permission check is in app/admin/layout.tsx (needs Prisma)
    return NextResponse.next();
  }

  // ── Protected app routes ───────────────────────────────────────────────────
  const protectedPaths = ['/dashboard', '/account', '/tasks', '/timer', '/launchpad'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const token = await getToken({ req: request });

    if (!token) {
      const signInUrl = new URL('/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Suspended users can only see /account/suspended
    const accountState = (token as { accountState?: string }).accountState;
    if (accountState === 'suspended' && !pathname.startsWith('/account/suspended')) {
      return NextResponse.redirect(new URL('/account/suspended', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, API routes we handle ourselves,
    // and Next.js internals.
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
