/**
 * Unit tests: transcribeAudio (OpenAI mocked)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcribeAudio } from '../whisper-client';
import { __setOpenAIForTests } from '../openai-client';

const create = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  __setOpenAIForTests({ audio: { transcriptions: { create } } });
});

function fakeFile(size: number): File {
  return { size, name: 'audio.webm' } as unknown as File;
}

describe('transcribeAudio', () => {
  it('returns the trimmed transcript', async () => {
    create.mockResolvedValue({ text: '  Email Sarah back  ' });
    const text = await transcribeAudio(fakeFile(1234));
    expect(text).toBe('Email Sarah back');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: 'whisper-1' }));
  });

  it('throws empty_audio for an empty file (no API call)', async () => {
    await expect(transcribeAudio(fakeFile(0))).rejects.toMatchObject({ code: 'empty_audio' });
    expect(create).not.toHaveBeenCalled();
  });

  it('throws transcription_failed when the API errors', async () => {
    create.mockRejectedValue(new Error('429 rate limit'));
    await expect(transcribeAudio(fakeFile(500))).rejects.toMatchObject({ code: 'transcription_failed' });
  });

  it('handles a missing text field gracefully', async () => {
    create.mockResolvedValue({});
    const text = await transcribeAudio(fakeFile(500));
    expect(text).toBe('');
  });
});
