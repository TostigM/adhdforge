/**
 * gpt-task-parser.ts — text → structured tasks via gpt-4o-mini.
 * ──────────────────────────────────────────────────────────────────────────────
 * Uses strict JSON-schema structured output so the response shape is guaranteed.
 * We still defensively coerce/clamp the values before returning.
 *
 * See 06-build-roadmap.md §7.1
 */

import { getOpenAI } from './openai-client';
import { PARSED_TASKS_JSON_SCHEMA, buildTaskParsingMessages } from './prompts/task-parsing';

export type PriorityKind = 'anchor' | 'flexible';
export type PriorityLevel = 'cant_miss' | 'high' | 'med' | 'low';

export type ParsedTask = {
  rawText: string;
  title: string | null;
  priorityKind: PriorityKind;
  priorityLevel: PriorityLevel;
  scheduledFor: string | null; // ISO 8601
  estimatedMinutes: number | null;
  steps: string[];
};

const LEVELS: PriorityLevel[] = ['cant_miss', 'high', 'med', 'low'];

function coerce(raw: unknown): ParsedTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;

  const rawText = typeof t.rawText === 'string' ? t.rawText.trim() : '';
  if (!rawText) return null;

  const priorityKind: PriorityKind = t.priorityKind === 'anchor' ? 'anchor' : 'flexible';
  let priorityLevel: PriorityLevel = LEVELS.includes(t.priorityLevel as PriorityLevel)
    ? (t.priorityLevel as PriorityLevel)
    : 'med';

  // Soft-Track invariant: cant_miss only valid for anchors.
  if (priorityLevel === 'cant_miss' && priorityKind !== 'anchor') priorityLevel = 'high';

  const steps = Array.isArray(t.steps)
    ? t.steps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
    : [];

  const estimatedMinutes =
    typeof t.estimatedMinutes === 'number' && Number.isFinite(t.estimatedMinutes) && t.estimatedMinutes > 0
      ? Math.round(t.estimatedMinutes)
      : null;

  const scheduledFor =
    priorityKind === 'anchor' && typeof t.scheduledFor === 'string' && t.scheduledFor.trim()
      ? t.scheduledFor.trim()
      : null;

  return {
    rawText,
    title: typeof t.title === 'string' && t.title.trim() ? t.title.trim() : null,
    priorityKind,
    priorityLevel,
    scheduledFor,
    estimatedMinutes,
    steps,
  };
}

export async function parseTasks(text: string, opts: { now?: Date } = {}): Promise<ParsedTask[]> {
  const input = text.trim();
  if (!input) return [];

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: buildTaskParsingMessages(input, opts.now ?? new Date()),
    response_format: { type: 'json_schema', json_schema: PARSED_TASKS_JSON_SCHEMA },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const tasks = (parsed as { tasks?: unknown })?.tasks;
  if (!Array.isArray(tasks)) return [];

  return tasks.map(coerce).filter((t): t is ParsedTask => t !== null);
}
