import { Data, Effect as VendorEffect, pipe } from "effect";

export type RawrEffect<TSuccess, TError = never, TRequirements = never> =
  VendorEffect.Effect<TSuccess, TError, TRequirements>;

export type RawrEffectYield<TError = never, TRequirements = never> =
  RawrEffect<unknown, TError, TRequirements>;

export type RawrEffectSuccess<TEffect> =
  TEffect extends RawrEffect<infer TSuccess, unknown, unknown> ? TSuccess : never;

export type RawrEffectError<TEffect> =
  TEffect extends RawrEffect<unknown, infer TError, unknown> ? TError : never;

export type RawrEffectRequirements<TEffect> =
  TEffect extends RawrEffect<unknown, unknown, infer TRequirements> ? TRequirements : never;

export type EffectBody<TContext, TOutput, TError = never, TRequirements = never> =
  (
    context: TContext,
  ) =>
    | Generator<RawrEffectYield<TError, TRequirements>, TOutput, unknown>
    | RawrEffect<TOutput, TError, TRequirements>;

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

export type TaggedErrorConstructor<TTag extends string> =
  new <const TFields extends Record<string, unknown> = {}>(
    fields?: TFields,
  ) => TFields & { readonly _tag: TTag };

export function TaggedError<const TTag extends string>(
  tag: TTag,
): TaggedErrorConstructor<TTag> {
  return Data.TaggedError(tag) as unknown as TaggedErrorConstructor<TTag>;
}

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

export const Effect = {
  all: VendorEffect.all,
  catchAll: VendorEffect.catch,
  catchTag: VendorEffect.catchTag,
  fail: VendorEffect.fail,
  flatMap: VendorEffect.flatMap,
  gen: VendorEffect.gen,
  map: VendorEffect.map,
  match: VendorEffect.match,
  succeed: VendorEffect.succeed,
  sync: VendorEffect.sync,
  try: VendorEffect.try,
  tryPromise: VendorEffect.tryPromise,
} as const;

export { pipe };
