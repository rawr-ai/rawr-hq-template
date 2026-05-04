const RAW_EFFECT: unique symbol = Symbol("rawr.effect");
const RAW_EFFECT_YIELD: unique symbol = Symbol("rawr.effect-yield");

export interface RawrEffectYield<TError = never, TRequirements = never> {
  readonly [RAW_EFFECT_YIELD]: {
    readonly error: TError;
    readonly requirements: TRequirements;
  };
}

export interface RawrEffect<TSuccess, TError = never, TRequirements = never> {
  readonly [RAW_EFFECT]: {
    readonly success: TSuccess;
    readonly error: TError;
    readonly requirements: TRequirements;
  };
  [Symbol.iterator](): Generator<RawrEffectYield<TError, TRequirements>, TSuccess, unknown>;
}

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
  return {
    [RAW_EFFECT]: undefined as unknown as RawrEffect<
      TSuccess,
      TError,
      TRequirements
    >[typeof RAW_EFFECT],
    *[Symbol.iterator](): Generator<
      RawrEffectYield<TError, TRequirements>,
      TSuccess,
      unknown
    > {
      return value;
    },
  };
}

export function makeRawrFailure<TError>(
  error: TError,
): RawrEffect<never, TError> {
  return {
    [RAW_EFFECT]: undefined as unknown as RawrEffect<
      never,
      TError
    >[typeof RAW_EFFECT],
    *[Symbol.iterator](): Generator<RawrEffectYield<TError>, never, unknown> {
      throw error;
    },
  };
}

export const Effect = {
  succeed<TSuccess>(value: TSuccess): RawrEffect<TSuccess> {
    return makeRawrEffect(value);
  },

  fail<TError>(error: TError): RawrEffect<never, TError> {
    return makeRawrFailure(error);
  },

  tryPromise<TSuccess, TError>(input: {
    readonly try: () => Promise<TSuccess>;
    readonly catch: (cause: unknown) => TError;
  }): RawrEffect<TSuccess, TError> {
    void input;
    return makeRawrEffect(undefined as unknown as TSuccess);
  },
};

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

type ErrorFields = Record<string, unknown>;

export type TaggedErrorConstructor<TTag extends string> =
  new <const TFields extends ErrorFields = {}>(
    fields: keyof TFields extends never ? void | undefined : TFields,
  ) => Error & TFields & { readonly _tag: TTag };

export function TaggedError<const TTag extends string>(
  tag: TTag,
): TaggedErrorConstructor<TTag> {
  class RawrTaggedError extends Error {
    readonly _tag = tag;

    constructor(fields?: ErrorFields) {
      super(tag);
      this.name = tag;
      if (fields) Object.assign(this, fields);
    }
  }

  return RawrTaggedError as unknown as TaggedErrorConstructor<TTag>;
}
