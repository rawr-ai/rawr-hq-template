type NonEmptyReadonlyTuple<T> = readonly [T, ...T[]];

/**
 * Represents the service-wide outcome of internal release computation.
 *
 * The discriminant keeps successful values and nonempty failure diagnostics
 * mutually exclusive while concrete oRPC operations retain their own
 * boundary-specific TypeBox result schemas.
 *
 * @typeParam T Value produced by a successful release computation.
 * @typeParam E Diagnostic produced by a failed release computation.
 */
export type ReleaseResult<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: NonEmptyReadonlyTuple<E> };
