/**
 * task-parsing.ts — Prompt + strict JSON schema for turning messy speech/text
 * into structured Focus Forge tasks (M7).
 * ──────────────────────────────────────────────────────────────────────────────
 * Framing rules baked into the prompt:
 *   - anchor only when a fixed time/deadline is detected; otherwise flexible.
 *   - priorityLevel 'cant_miss' ONLY for clearly fixed, non-negotiable, time-bound
 *     events (and only on anchors). Never "urgent". Never implies red.
 *   - scheduledFor is an ISO datetime resolved against the supplied "now".
 *   - steps only when the task is genuinely multi-step.
 *
 * See 06-build-roadmap.md §7.1
 */

export const PARSED_TASKS_JSON_SCHEMA = {
  name: 'parsed_tasks',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['tasks'],
    properties: {
      tasks: {
        type: 'array',
        description: 'Distinct tasks extracted from the input. May be empty.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['rawText', 'title', 'priorityKind', 'priorityLevel', 'scheduledFor', 'estimatedMinutes', 'steps'],
          properties: {
            rawText: { type: 'string', description: 'A clean, self-contained restatement of the single task.' },
            title: { type: ['string', 'null'], description: 'Optional short title; null if rawText is already short.' },
            priorityKind: { type: 'string', enum: ['anchor', 'flexible'] },
            priorityLevel: { type: 'string', enum: ['cant_miss', 'high', 'med', 'low'] },
            scheduledFor: { type: ['string', 'null'], description: 'ISO 8601 datetime for anchors with a time; otherwise null.' },
            estimatedMinutes: { type: ['integer', 'null'], description: 'Rough duration in minutes if implied; otherwise null.' },
            steps: { type: 'array', items: { type: 'string' }, description: 'Ordered sub-steps if the task is multi-step; otherwise empty.' },
          },
        },
      },
    },
  },
} as const;

export function buildTaskParsingMessages(input: string, now: Date) {
  const system = [
    'You convert a person\'s messy brain-dump (often ADHD, often rushed) into a clean list of actionable tasks.',
    '',
    'Rules:',
    '- Split the input into DISTINCT tasks. One clear action per task. Do not merge unrelated things; do not invent tasks that were not said.',
    '- priorityKind: "anchor" ONLY if the task is tied to a specific fixed time or hard deadline (a meeting, an appointment, "at 3pm", "by Friday 5pm"). Everything the person can choose when to do is "flexible".',
    '- priorityLevel: one of cant_miss | high | med | low.',
    '  - "cant_miss" ONLY for a clearly fixed, non-negotiable, time-bound event (and only when priorityKind is "anchor"). Examples: a flight, a scheduled medical appointment, a job interview.',
    '  - Otherwise pick high / med / low from how the person stresses it. Default to "med" when unsure. Never use "urgent".',
    '- scheduledFor: for anchors with a time, output an ISO 8601 datetime. Resolve relative references ("tomorrow at 3pm", "in an hour") against the current time given below. For flexible tasks, null.',
    '- estimatedMinutes: a rough integer if a duration is implied or obvious; otherwise null.',
    '- steps: include 2–5 short ordered steps ONLY if the task is genuinely multi-step or complex; otherwise an empty array.',
    '- rawText: a clean one-line restatement of that single task. title: a short label, or null if rawText is already short.',
    '',
    `Current time (use for resolving relative dates): ${now.toISOString()}`,
    '',
    'Return ONLY the structured JSON.',
  ].join('\n');

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: input },
  ];
}
