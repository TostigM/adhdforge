/**
 * Minimal Result<T, E> type for domain functions.
 * Functions return Ok or Err — callers pattern-match on `ok`.
 * No exceptions thrown across the domain boundary.
 */

export type Ok<T> = { ok: true; value: T };
export type Err<E extends string = string> = { ok: false; error: E; message?: string };
export type Result<T, E extends string = string> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E extends string>(error: E, message?: string): Err<E> {
  return { ok: false, error, message };
}
