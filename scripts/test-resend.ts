/**
 * scripts/test-resend.ts
 * Validates RESEND_API_KEY by sending a test email.
 *
 * Run:    pnpm test:resend
 * Needs:  .env.local with RESEND_API_KEY and RESEND_FROM_EMAIL set
 *         resend package installed (done in M2)
 *
 * IMPORTANT: Change TO_EMAIL to your real address before running.
 */

// NOTE: resend package is added in M2. Leaving as placeholder.

import { Resend } from 'resend';

// CHANGE THIS before running
const TO_EMAIL = 'your-email@example.com';

async function main() {
  const apiKey = process.env['RESEND_API_KEY'];
  const fromEmail = process.env['RESEND_FROM_EMAIL'] ?? 'onboarding@resend.dev';

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set in .env.local');
    process.exit(1);
  }

  if (TO_EMAIL === 'your-email@example.com') {
    console.error('❌ Edit scripts/test-resend.ts and set TO_EMAIL to your real address first.');
    process.exit(1);
  }

  console.log('Testing Resend connection...');
  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: TO_EMAIL,
      subject: 'Focus Forge — Resend connection test',
      text: 'If you received this, Resend is configured correctly.',
    });
    console.log('✅ Resend send works. Email ID:', result.data?.id);
  } catch (error) {
    console.error('❌ Resend connection failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
