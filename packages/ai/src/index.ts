/**
 * @focus-forge/ai — OpenAI integration (Whisper + GPT-4o-mini).
 */

export { getOpenAI, __setOpenAIForTests } from './openai-client';
export { transcribeAudio } from './whisper-client';
export type { TranscribeError } from './whisper-client';
export { parseTasks } from './gpt-task-parser';
export type { ParsedTask, PriorityKind, PriorityLevel } from './gpt-task-parser';
export { PARSED_TASKS_JSON_SCHEMA, buildTaskParsingMessages } from './prompts/task-parsing';
