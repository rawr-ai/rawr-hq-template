import {
  Data,
  Effect as VendorEffect,
  pipe,
} from "effect";
import type { YieldWrap } from "effect/Utils";

/**
 * Curated RAWR Effect facade for authoring/runtime seams. It is backed by real
 * Effect in the lab, but it intentionally does not expose raw runtime
 * constructors or settle the final public helper set.
 */
export type RawrEffect<TSuccess, TError = never, TRequirements = never> =
  VendorEffect.Effect<TSuccess, TError, TRequirements>;

export type RawrEffectYield<TError = never, TRequirements = never> =
  YieldWrap<RawrEffect<unknown, TError, TRequirements>>;

export type RawrEffectSuccess<TEffect> =
  TEffect extends RawrEffect<infer TSuccess, unknown, unknown>
    ? TSuccess
    : never;

export type RawrEffectError<TEffect> =
  TEffect extends RawrEffect<unknown, infer TError, unknown>
    ? TError
    : never;

export type RawrEffectRequirements<TEffect> =
  TEffect extends RawrEffect<unknown, unknown, infer TRequirements>
    ? TRequirements
    : never;

export type EffectBody<TContext, TOutput, TError = never, TRequirements = never> =
  (
    context: TContext,
  ) =>
    | Generator<RawrEffectYield<TError, TRequirements>, TOutput, unknown>
    | RawrEffect<TOutput, TError, TRequirements>;

export function makeRawrEffect<TSuccess, TError = never, TRequirements = never>(
  value: TSuccess,
): RawrEffect<TSuccess, TError, TRequirements> {
  return VendorEffect.succeed(value);
}

export function makeRawrFailure<TError>(
  error: TError,
): RawrEffect<never, TError> {
  return VendorEffect.fail(error);
}

/**
 * Minimal authoring surface intentionally selected for the lab. Expanding this
 * object is a public API/DX decision, not a convenience export from Effect.
 */
export const Effect = {
  succeed: VendorEffect.succeed,
  fail: VendorEffect.fail,
  sync: VendorEffect.sync,
  try: VendorEffect.try,
  tryPromise: VendorEffect.tryPromise,
  map: VendorEffect.map,
  flatMap: VendorEffect.flatMap,
  catchTag: VendorEffect.catchTag,
  catchAll: VendorEffect.catchAll,
} as const;

export { pipe };

/**
 * Declarative policy records used by contained boundary experiments. They
 * record intent only; timeout enforcement, retry scheduling, durable async
 * policy, and host error mapping remain runtime-layer work.
 */
export interface RawrRetryPolicy {
  readonly kind: "rawr.retry-policy";
  readonly attempts: number;
}

export interface RawrTimeoutPolicy {
  readonly kind: "rawr.timeout-policy";
  readonly milliseconds: number;
}

export interface RawrConcurrencyPolicy {
  readonly kind: "rawr.concurrency-policy";
  readonly limit: number;
}

export const TaggedError = Data.TaggedError;
