/**
 * scripts/test-openai.ts
 * Validates OPENAI_API_KEY works for GPT-4o-mini.
 * Whisper test is skipped here (requires a real audio file).
 *
 * Run:    pnpm test:openai
 * Needs:  .env.local with OPENAI_API_KEY set
 *         pnpm add openai (in packages/ai, done in M7)
 */

// NOTE: openai package is added in M7. This script will error until then.
// Leaving it here as a placeholder so the test infrastructure is in place.

import OpenAI from 'openai';

async function main() {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set in .env.local');
    process.exit(1);
  }

  console.log('Testing OpenAI connection...');
  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
      max_tokens: 5,
    });
    console.log('✅ GPT-4o-mini works:', completion.choices[0]?.message.content);
    console.log('ℹ️  Whisper test skipped (requires audio file — run manually in M7)');
  } catch (error) {
    console.error('❌ OpenAI connection failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
