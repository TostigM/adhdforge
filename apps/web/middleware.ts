/**
 * Next.js Middleware — Auth + Account State Guards
 * ──────────────────────────────────────────────────────────────────────────────
 * Runs on every request. Handles:
 *   1. Protecting /dashboard and /account routes (redirect to /signin if not authed)
 *   2. Hiding /admin routes (404 for non-admins — never 403, see doc 07)
 *
 * NOTE: Middleware runs on the Edge runtime — Prisma is NOT available here.
 * We use DATABASE sessions (not JWT), so getToken() from next-auth/jwt always
 * returns null and cannot be used. Instead we check for the presence of the
 * NextAuth session cookie as a lightweight "is there a session?" gate.
 * The full auth validation (user object, account state, permissions) happens
 * in server components/layouts that have Prisma access.
 *
 * Suspended-user redirect is handled in auth.ts signIn callback and the
 * account/suspended server component — not here.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Returns true if a NextAuth database session cookie is present.
 * Cookie names:
 *   next-auth.session-token        — HTTP (dev)
 *   __Secure-next-auth.session-token — HTTPS (prod)
 *
 * Presence of the cookie is a fast gate only. The actual session validity
 * (expiry, user state) is verified in each server component via getServerSession().
 */
function hasSessionCookie(request: NextRequest): boolean {
  return !!(
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-next-auth.session-token')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /admin routes ──────────────────────────────────────────────────────────
  // Return 404 (via rewrite to /not-found) for unauthenticated users so the
  // admin section isn't even discoverable. The full permission check happens
  // in app/admin/layout.tsx (needs Prisma to verify feature grants).
  if (pathname.startsWith('/admin')) {
    if (!hasSessionCookie(request)) {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }
    return NextResponse.next();
  }

  // ── Protected app routes ───────────────────────────────────────────────────
  const protectedPaths = ['/dashboard', '/account', '/tasks', '/walk', '/timer', '/launchpad'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSessionCookie(request)) {
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
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
