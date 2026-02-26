/**
 * @fileoverview Shared helpers for converting `neverthrow` results in procedures.
 *
 * @remarks
 * These helpers intentionally do not construct ORPC errors directly. They delegate
 * mapping to caller-provided handlers so each procedure keeps explicit control over
 * its declared `.errors(...)` contract.
 *
 * Why this exists:
 * - Reduces repeated `isOk()` branching noise.
 * - Keeps common result shapes (`DatabaseError`, `NotFoundError | DatabaseError`)
 *   easy to unwrap without hiding procedure-level error decisions.
 *
 * Optional refactor note: if router handlers become too repetitive, add focused
 * unwrap helpers per common error union, but avoid one global catch-all unwrap.
 *
 * @agents
 * Do not throw raw ORPC errors from repositories. Keep repos returning `Result`
 * values and map to ORPC errors only in procedure handlers.
 */
import type { Result } from "neverthrow";
import type { DatabaseError, NotFoundError } from "./errors";

export async function unwrapDatabaseResult<T>(
  result: PromiseLike<Result<T, DatabaseError>>,
  handlers: {
    onDatabaseError: (error: DatabaseError) => never;
  },
): Promise<T> {
  const resolved = await result;
  if (resolved.isOk()) {
    return resolved.value;
  }

  return handlers.onDatabaseError(resolved.error);
}

export async function unwrapSharedResult<T>(
  result: PromiseLike<Result<T, NotFoundError | DatabaseError>>,
  handlers: {
    onNotFoundError: (error: NotFoundError) => never;
    onDatabaseError: (error: DatabaseError) => never;
  },
): Promise<T> {
  const resolved = await result;
  if (resolved.isOk()) {
    return resolved.value;
  }

  if (resolved.error._tag === "NotFoundError") {
    return handlers.onNotFoundError(resolved.error);
  }

  return handlers.onDatabaseError(resolved.error);
}
