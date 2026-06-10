/**
 * Unit tests: parseTasks (OpenAI mocked)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseTasks } from '../gpt-task-parser';
import { __setOpenAIForTests } from '../openai-client';

const create = vi.fn();

function mockResponse(tasks: unknown[]) {
  create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ tasks }) } }] });
}

beforeEach(() => {
  vi.clearAllMocks();
  __setOpenAIForTests({ chat: { completions: { create } } });
});

describe('parseTasks', () => {
  it('returns [] for empty input WITHOUT calling the API', async () => {
    const r = await parseTasks('   ');
    expect(r).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });

  it('parses multiple distinct tasks', async () => {
    mockResponse([
      { rawText: 'Email Sarah back', title: null, priorityKind: 'flexible', priorityLevel: 'high', scheduledFor: null, estimatedMinutes: 10, steps: [] },
      { rawText: 'Get groceries', title: null, priorityKind: 'flexible', priorityLevel: 'med', scheduledFor: null, estimatedMinutes: null, steps: [] },
      { rawText: 'Dentist at 3pm', title: 'Dentist', priorityKind: 'anchor', priorityLevel: 'cant_miss', scheduledFor: '2026-06-09T22:00:00Z', estimatedMinutes: 30, steps: [] },
    ]);
    const r = await parseTasks('email sarah, groceries, dentist at 3pm tomorrow');
    expect(r).toHaveLength(3);
    expect(r[0]!.rawText).toBe('Email Sarah back');
    expect(r[2]!.priorityKind).toBe('anchor');
    expect(r[2]!.scheduledFor).toBe('2026-06-09T22:00:00Z');
  });

  it('downgrades cant_miss to high on a flexible task (Soft-Track invariant)', async () => {
    mockResponse([
      { rawText: 'Do the thing', title: null, priorityKind: 'flexible', priorityLevel: 'cant_miss', scheduledFor: null, estimatedMinutes: null, steps: [] },
    ]);
    const r = await parseTasks('do the thing');
    expect(r[0]!.priorityLevel).toBe('high');
  });

  it('nulls scheduledFor on flexible tasks even if the model returns one', async () => {
    mockResponse([
      { rawText: 'Maybe call mom', title: null, priorityKind: 'flexible', priorityLevel: 'low', scheduledFor: '2026-06-09T10:00:00Z', estimatedMinutes: null, steps: [] },
    ]);
    const r = await parseTasks('call mom sometime');
    expect(r[0]!.scheduledFor).toBeNull();
  });

  it('filters blank steps and keeps real ones', async () => {
    mockResponse([
      { rawText: 'Plan trip', title: null, priorityKind: 'flexible', priorityLevel: 'med', scheduledFor: null, estimatedMinutes: null, steps: ['Book flights', '   ', 'Reserve hotel'] },
    ]);
    const r = await parseTasks('plan the trip');
    expect(r[0]!.steps).toEqual(['Book flights', 'Reserve hotel']);
  });

  it('defaults an unknown priorityLevel to med', async () => {
    mockResponse([
      { rawText: 'Vague task', title: null, priorityKind: 'flexible', priorityLevel: 'urgent', scheduledFor: null, estimatedMinutes: null, steps: [] },
    ]);
    const r = await parseTasks('vague task');
    expect(r[0]!.priorityLevel).toBe('med');
  });

  it('drops tasks with empty rawText', async () => {
    mockResponse([
      { rawText: '', title: null, priorityKind: 'flexible', priorityLevel: 'med', scheduledFor: null, estimatedMinutes: null, steps: [] },
      { rawText: 'Real one', title: null, priorityKind: 'flexible', priorityLevel: 'med', scheduledFor: null, estimatedMinutes: null, steps: [] },
    ]);
    const r = await parseTasks('something');
    expect(r).toHaveLength(1);
    expect(r[0]!.rawText).toBe('Real one');
  });

  it('returns [] when the model returns invalid JSON', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: 'not json' } }] });
    const r = await parseTasks('whatever');
    expect(r).toEqual([]);
  });

  it('returns [] when there is no content', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const r = await parseTasks('whatever');
    expect(r).toEqual([]);
  });

  it('requests gpt-4o-mini with strict json_schema', async () => {
    mockResponse([]);
    await parseTasks('hi');
    const arg = create.mock.calls[0][0];
    expect(arg.model).toBe('gpt-4o-mini');
    expect(arg.response_format.type).toBe('json_schema');
    expect(arg.response_format.json_schema.strict).toBe(true);
  });
});
