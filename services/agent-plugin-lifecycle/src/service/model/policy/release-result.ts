import type { ReleaseResult } from "../dto/release-result";

type NonEmptyReadonlyTuple<T> = readonly [T, ...T[]];

/**
 * Constructs the successful branch of an internal release computation.
 *
 * @typeParam T Value produced by the computation.
 * @param value Successful value retained by identity.
 */
export function success<T>(value: T): ReleaseResult<T, never> {
  return { ok: true, value };
}

/**
 * Constructs the failed branch of an internal release computation.
 *
 * @typeParam E Diagnostic emitted by the computation.
 * @param issues Ordered nonempty diagnostics retained by identity.
 */
export function failure<E>(issues: NonEmptyReadonlyTuple<E>): ReleaseResult<never, E> {
  return { ok: false, issues };
}

/**
 * Narrows an ordered diagnostic collection when at least one issue exists.
 *
 * @typeParam E Diagnostic carried by the collection.
 * @param issues Diagnostics to inspect without copying or reordering.
 */
export function asNonEmpty<E>(issues: readonly E[]): NonEmptyReadonlyTuple<E> | undefined {
  return issues.length === 0 ? undefined : (issues as NonEmptyReadonlyTuple<E>);
}
