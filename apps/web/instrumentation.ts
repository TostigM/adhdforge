/**
 * Next.js instrumentation hook — runs once when the server boots.
 * Validates the environment before the app serves anything (fail fast).
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only the Node runtime has the full env; skip the Edge middleware bundle.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
}
