/**
 * create-task.ts — Domain: create a new task
 * ──────────────────────────────────────────────────────────────────────────────
 * Pure logic. No HTTP, no session handling.
 * Caller is responsible for auth checks before calling this.
 *
 * Soft-Track Protocol: status always starts as 'active'. No 'failed'. No 'urgent'.
 * See 04-mysql-schema.md §4.5
 */

import type {
  PrismaClient,
  Task,
  TaskCaptureMethod,
  TaskPriorityKind,
  TaskPriorityLevel,
} from '@prisma/client';

import { checkAndAward } from '../badges/check-and-award';
import { err, ok, type Err, type Result } from '../result';

// ─── Input / Output ───────────────────────────────────────────────────────────

export type CreateTaskInput = {
  userId: string;
  rawText: string;
  title?: string;
  notes?: string;
  priorityKind?: TaskPriorityKind;
  priorityLevel?: TaskPriorityLevel;
  scheduledFor?: Date;
  estimatedMinutes?: number;
  captureMethod?: TaskCaptureMethod;
};

export type CreateTaskError =
  | 'raw_text_empty'
  | 'raw_text_too_long'
  | 'cant_miss_requires_anchor'
  | 'db_error';

export type CreateTaskResult = Result<Task, CreateTaskError>;

// ─── Validation ───────────────────────────────────────────────────────────────

const MAX_RAW_TEXT = 10_000;

function validate(input: CreateTaskInput): Err<CreateTaskError> | undefined {
  const text = input.rawText.trim();
  if (!text) return err('raw_text_empty', 'Task text cannot be empty.');
  if (text.length > MAX_RAW_TEXT)
    return err('raw_text_too_long', `Task text must be under ${MAX_RAW_TEXT} characters.`);

  // Soft-Track: cant_miss is ONLY valid for anchor tasks
  if (input.priorityLevel === 'cant_miss' && input.priorityKind !== 'anchor') {
    return err('cant_miss_requires_anchor', "'cant_miss' priority is only valid for anchor tasks.");
  }

  return undefined;
}

// ─── Core function ────────────────────────────────────────────────────────────

export async function createTask(
  db: PrismaClient,
  input: CreateTaskInput,
): Promise<CreateTaskResult> {
  const validationError = validate(input);
  if (validationError) return validationError;

  const rawText = input.rawText.trim();

  try {
    const task = await db.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          userId: input.userId,
          rawText,
          title: input.title?.trim() || null,
          notes: input.notes?.trim() || null,
          priorityKind: input.priorityKind ?? 'flexible',
          priorityLevel: input.priorityLevel ?? 'med',
          scheduledFor: input.scheduledFor ?? null,
          estimatedMinutes: input.estimatedMinutes ?? null,
          captureMethod: input.captureMethod ?? 'text',
          status: 'active',
        },
      });

      // Append-only event log — badge engine reads from this
      await tx.event.create({
        data: {
          userId: input.userId,
          eventType: 'task.created',
          payload: { taskId: created.id },
        },
      });

      return created;
    });

    // Badge check (after transaction — non-fatal if it fails)
    await checkAndAward(db, input.userId, 'task.created').catch((e) => {
      console.error('[badge] check-and-award failed after task.created:', e);
    });

    return ok(task);
  } catch (e) {
    console.error('[create-task] db error:', e);
    return err('db_error', 'Failed to save task. Please try again.');
  }
}
