/**
 * whisper-client.ts — audio → text via OpenAI Whisper (M7).
 * ──────────────────────────────────────────────────────────────────────────────
 * The caller passes the recorded audio (a File/Blob from the upload). The audio
 * is sent to Whisper and never persisted by us (Inviolable Rule 9).
 *
 * See 06-build-roadmap.md §7.1
 */

import { getOpenAI } from './openai-client';

export type TranscribeError = 'empty_audio' | 'transcription_failed';

/**
 * Transcribe an audio file. Returns the trimmed transcript text.
 * Throws a TranscribeError-tagged Error on failure (caller decides UX).
 */
export async function transcribeAudio(file: File): Promise<string> {
  if (!file || file.size === 0) {
    const e = new Error('Audio was empty.');
    (e as Error & { code: TranscribeError }).code = 'empty_audio';
    throw e;
  }

  try {
    const result = await getOpenAI().audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });
    return (result.text ?? '').trim();
  } catch (cause) {
    const e = new Error('Transcription failed.');
    (e as Error & { code: TranscribeError; cause: unknown }).code = 'transcription_failed';
    (e as Error & { cause: unknown }).cause = cause;
    throw e;
  }
}
