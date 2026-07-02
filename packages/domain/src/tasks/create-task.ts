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
  | 'estimated_minutes_invalid'
  | 'scheduled_for_invalid'
  | 'db_error';

export type CreateTaskResult = Result<Task, CreateTaskError>;

// ─── Validation ───────────────────────────────────────────────────────────────

const MAX_RAW_TEXT = 10_000;
// A week — generous, but stops nonsense values (negative, NaN, "a million minutes")
// from a hand-crafted request reaching the DB.
const MAX_ESTIMATED_MINUTES = 10_080;

function validate(input: CreateTaskInput): Err<CreateTaskError> | undefined {
  const text = input.rawText.trim();
  if (!text) return err('raw_text_empty', 'Task text cannot be empty.');
  if (text.length > MAX_RAW_TEXT)
    return err('raw_text_too_long', `Task text must be under ${MAX_RAW_TEXT} characters.`);

  // Soft-Track: cant_miss is ONLY valid for anchor tasks
  if (input.priorityLevel === 'cant_miss' && input.priorityKind !== 'anchor') {
    return err('cant_miss_requires_anchor', "'cant_miss' priority is only valid for anchor tasks.");
  }

  if (input.estimatedMinutes !== undefined) {
    if (
      !Number.isInteger(input.estimatedMinutes) ||
      input.estimatedMinutes < 1 ||
      input.estimatedMinutes > MAX_ESTIMATED_MINUTES
    ) {
      return err('estimated_minutes_invalid', 'Estimate must be between 1 minute and a week.');
    }
  }

  if (input.scheduledFor !== undefined && Number.isNaN(input.scheduledFor.getTime())) {
    return err('scheduled_for_invalid', "That date didn't come through — please pick it again.");
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
