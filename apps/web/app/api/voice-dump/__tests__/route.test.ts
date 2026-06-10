/**
 * Integration tests: POST /api/voice-dump (OpenAI + DB mocked)
 *
 * Verifies the orchestration: auth → quota gate → transcribe → parse → create
 * tasks → increment quota, plus the failure/short-circuit paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@focus-forge/database/client', () => ({ db: {} }));
vi.mock('@focus-forge/domain/quota/check-quota', () => ({ checkQuota: vi.fn() }));
vi.mock('@focus-forge/domain/quota/increment-quota', () => ({ incrementQuota: vi.fn() }));
vi.mock('@focus-forge/domain/tasks/create-task', () => ({ createTask: vi.fn() }));
vi.mock('@focus-forge/domain/tasks/add-step', () => ({ addStep: vi.fn() }));
vi.mock('@focus-forge/ai', () => ({ transcribeAudio: vi.fn(), parseTasks: vi.fn() }));

import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { checkQuota } from '@focus-forge/domain/quota/check-quota';
import { incrementQuota } from '@focus-forge/domain/quota/increment-quota';
import { createTask } from '@focus-forge/domain/tasks/create-task';
import { addStep } from '@focus-forge/domain/tasks/add-step';
import { transcribeAudio, parseTasks } from '@focus-forge/ai';

function audioRequest(bytes = [1, 2, 3]): Request {
  const form = new FormData();
  form.append('audio', new File([new Uint8Array(bytes)], 'a.webm', { type: 'audio/webm' }));
  return new Request('http://localhost/api/voice-dump', { method: 'POST', body: form });
}

const ALLOWED = { allowed: true, used: 0, limit: 10, resetsAtUtc: new Date('2026-06-09T04:00:00Z') };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'user_1' } } as never);
  vi.mocked(checkQuota).mockResolvedValue(ALLOWED as never);
  vi.mocked(incrementQuota).mockResolvedValue(undefined as never);
  vi.mocked(transcribeAudio).mockResolvedValue('email sarah and get groceries');
  vi.mocked(parseTasks).mockResolvedValue([
    { rawText: 'Email Sarah', title: null, priorityKind: 'flexible', priorityLevel: 'high', scheduledFor: null, estimatedMinutes: null, steps: [] },
    { rawText: 'Get groceries', title: null, priorityKind: 'flexible', priorityLevel: 'med', scheduledFor: null, estimatedMinutes: null, steps: ['Make a list'] },
  ] as never);
  vi.mocked(createTask).mockImplementation((async (_db: unknown, input: { rawText: string }) => ({
    ok: true,
    value: { id: 'task_' + input.rawText.slice(0, 4), rawText: input.rawText, title: null, priorityKind: 'flexible', priorityLevel: 'med' },
  })) as never);
  vi.mocked(addStep).mockResolvedValue({ ok: true, value: { id: 'step_1' } } as never);
});

describe('POST /api/voice-dump', () => {
  it('401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    const res = await POST(audioRequest());
    expect(res.status).toBe(401);
  });

  it('429 when the quota is exhausted — and never calls OpenAI', async () => {
    vi.mocked(checkQuota).mockResolvedValue({ allowed: false, used: 10, limit: 10, resetsAtUtc: new Date('2026-06-09T04:00:00Z') } as never);
    const res = await POST(audioRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('quota_exceeded');
    expect(body.resetsAtUtc).toBe('2026-06-09T04:00:00.000Z');
    expect(transcribeAudio).not.toHaveBeenCalled();
    expect(parseTasks).not.toHaveBeenCalled();
  });

  it('happy path: creates tasks + steps, increments quota, returns transcript', async () => {
    const res = await POST(audioRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.transcript).toBe('email sarah and get groceries');
    expect(body.tasks).toHaveLength(2);
    expect(createTask).toHaveBeenCalledTimes(2);
    expect(addStep).toHaveBeenCalledTimes(1); // only the groceries task had a step
    expect(incrementQuota).toHaveBeenCalledWith({}, 'user_1', 'voice_dump');
  });

  it('400 when there is no audio file', async () => {
    const res = await POST(new Request('http://localhost/api/voice-dump', { method: 'POST', body: new FormData() }));
    expect(res.status).toBe(400);
  });

  it('502 when transcription fails', async () => {
    vi.mocked(transcribeAudio).mockRejectedValue(new Error('whisper down'));
    const res = await POST(audioRequest());
    expect(res.status).toBe(502);
    expect(incrementQuota).not.toHaveBeenCalled();
  });

  it('empty transcript → 200 with no tasks (does not call the parser)', async () => {
    vi.mocked(transcribeAudio).mockResolvedValue('');
    const res = await POST(audioRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tasks).toEqual([]);
    expect(parseTasks).not.toHaveBeenCalled();
  });
});
