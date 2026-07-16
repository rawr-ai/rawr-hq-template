export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type ControllerResult<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: NonEmptyReadonlyArray<E> };

export function success<T>(value: T): ControllerResult<T, never> {
  return { ok: true, value };
}

export function failure<E>(issues: NonEmptyReadonlyArray<E>): ControllerResult<never, E> {
  return { ok: false, issues };
}

export function asNonEmpty<E>(issues: readonly E[]): NonEmptyReadonlyArray<E> | undefined {
  return issues.length === 0 ? undefined : issues as NonEmptyReadonlyArray<E>;
}
