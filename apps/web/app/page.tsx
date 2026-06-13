import { redirect } from 'next/navigation';

/**
 * Root route. Sends visitors into the app: `/dashboard` itself redirects to
 * `/signin?callbackUrl=/dashboard` when there's no session, so logged-out
 * visitors land on sign-in and logged-in users land on Today.
 */
export default function HomePage() {
  redirect('/dashboard');
}
