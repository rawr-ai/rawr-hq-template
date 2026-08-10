const habitatEffectOperation = Symbol("habitat.effect.operation");

export type HabitatDurationInput = number | `${number} ${"ms" | "seconds" | "minutes"}`;

export interface HabitatTimeoutError {
  readonly _tag: "HabitatTimeoutError";
  readonly duration: HabitatDurationInput;
}

export interface HabitatRetryPolicy {
  readonly times?: number;
  readonly backoff?: "fixed" | "exponential" | "none";
  readonly delay?: HabitatDurationInput;
}

export interface HabitatTimeoutPolicy {
  readonly duration: HabitatDurationInput;
}

export interface HabitatConcurrencyPolicy {
  readonly concurrency: number | "unbounded";
}

export type HabitatTelemetryAttributes = Readonly<Record<string, string | number | boolean | null>>;

export interface HabitatEffectYieldIterator<TSuccess, TError = never, TRequirements = never>
  extends Generator<HabitatEffect<TSuccess, TError, TRequirements>, TSuccess, TSuccess> {
  readonly __error?: TError;
  readonly __requirements?: TRequirements;
}

export interface HabitatEffect<TSuccess, TError = never, TRequirements = never> {
  readonly kind: "habitat.effect";
  readonly __success?: TSuccess;
  readonly __error?: TError;
  readonly __requirements?: TRequirements;
  [Symbol.iterator](): HabitatEffectYieldIterator<TSuccess, TError, TRequirements>;
  readonly [habitatEffectOperation]: HabitatEffectOperation;
}

export type HabitatEffectOperation =
  | { readonly kind: "succeed"; readonly value: unknown }
  | { readonly kind: "fail"; readonly error: unknown }
  | { readonly kind: "gen"; readonly body: () => Generator<unknown, unknown, unknown> }
  | {
      readonly kind: "try-promise";
      readonly attempt: () => Promise<unknown> | unknown;
      readonly recover: (cause: unknown) => unknown;
    }
  | {
      readonly kind: "all";
      readonly effects: Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>;
      readonly concurrency?: number | "unbounded";
      readonly discard?: boolean;
    }
  | {
      readonly kind: "transform";
      readonly transform:
        | "timeout"
        | "retry"
        | "map-error"
        | "catch-tag"
        | "catch-tags"
        | "or-else"
        | "match"
        | "span"
        | "interruptible";
      readonly source: HabitatEffect<unknown, unknown, unknown>;
      readonly input?: unknown;
    };

function makeEffect<TSuccess, TError = never, TRequirements = never>(
  operation: HabitatEffectOperation
): HabitatEffect<TSuccess, TError, TRequirements> {
  const effect = {
    kind: "habitat.effect" as const,
    [habitatEffectOperation]: operation,
    *[Symbol.iterator](): HabitatEffectYieldIterator<TSuccess, TError, TRequirements> {
      return yield effect;
    },
  };
  return Object.freeze(effect);
}

export function readHabitatEffectOperation(
  effect: HabitatEffect<unknown, unknown, unknown>
): HabitatEffectOperation {
  return effect[habitatEffectOperation];
}

type HabitatEffectSuccess<T> =
  T extends HabitatEffect<infer TSuccess, unknown, unknown> ? TSuccess : never;
type HabitatEffectError<T> =
  T extends HabitatEffect<unknown, infer TError, unknown> ? TError : never;
type HabitatEffectRequirements<T> =
  T extends HabitatEffect<unknown, unknown, infer TRequirements> ? TRequirements : never;

export type HabitatEffectSuccessRecord<
  TEffects extends Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>,
> = { readonly [TKey in keyof TEffects]: HabitatEffectSuccess<TEffects[TKey]> };
export type HabitatEffectErrorUnion<
  TEffects extends Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>,
> = HabitatEffectError<TEffects[keyof TEffects]>;
export type HabitatEffectRequirementUnion<
  TEffects extends Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>,
> = HabitatEffectRequirements<TEffects[keyof TEffects]>;

export interface HabitatEffectFacade {
  succeed<T>(value: T): HabitatEffect<T>;
  fail<E>(error: E): HabitatEffect<never, E>;
  gen<TSuccess, TError = never, TRequirements = never>(
    body: () => Generator<unknown, TSuccess, unknown>
  ): HabitatEffect<TSuccess, TError, TRequirements>;
  tryPromise<TSuccess, TError>(input: {
    readonly try: () => Promise<TSuccess> | TSuccess;
    readonly catch: (cause: unknown) => TError;
  }): HabitatEffect<TSuccess, TError>;
  all<const TEffects extends Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>>(
    effects: TEffects,
    options?: { readonly concurrency?: number | "unbounded"; readonly discard?: boolean }
  ): HabitatEffect<
    HabitatEffectSuccessRecord<TEffects>,
    HabitatEffectErrorUnion<TEffects>,
    HabitatEffectRequirementUnion<TEffects>
  >;
  timeout<TSuccess, TError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    duration: HabitatDurationInput
  ): HabitatEffect<TSuccess, TError | HabitatTimeoutError, TRequirements>;
  retry<TSuccess, TError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    policy: HabitatRetryPolicy
  ): HabitatEffect<TSuccess, TError, TRequirements>;
  mapError<TSuccess, TError, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    map: (error: TError) => TNextError
  ): HabitatEffect<TSuccess, TNextError, TRequirements>;
  catchTag<TSuccess, TError, TTag extends string, TNextSuccess, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    tag: TTag,
    handler: (
      error: Extract<TError, { readonly _tag: TTag }>
    ) => HabitatEffect<TNextSuccess, TNextError, TRequirements>
  ): HabitatEffect<
    TSuccess | TNextSuccess,
    Exclude<TError, { readonly _tag: TTag }> | TNextError,
    TRequirements
  >;
  catchTags<TSuccess, TError, TNextSuccess, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    handlers: Readonly<Record<string, (error: TError) => HabitatEffect<TNextSuccess, TNextError>>>
  ): HabitatEffect<TSuccess | TNextSuccess, TNextError, TRequirements>;
  orElse<TSuccess, TError, TNextSuccess, TNextError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    fallback: (error: TError) => HabitatEffect<TNextSuccess, TNextError, TRequirements>
  ): HabitatEffect<TSuccess | TNextSuccess, TNextError, TRequirements>;
  match<TSuccess, TError, TNextSuccess, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    handlers: {
      readonly onSuccess: (value: TSuccess) => TNextSuccess;
      readonly onFailure: (error: TError) => TNextSuccess;
    }
  ): HabitatEffect<TNextSuccess, never, TRequirements>;
  withSpan<TSuccess, TError, TRequirements>(
    name: string,
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    attributes?: HabitatTelemetryAttributes
  ): HabitatEffect<TSuccess, TError, TRequirements>;
  interruptible<TSuccess, TError, TRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>
  ): HabitatEffect<TSuccess, TError, TRequirements>;
}

const transform = <TSuccess, TError, TRequirements>(
  source: HabitatEffect<unknown, unknown, unknown>,
  name: Extract<HabitatEffectOperation, { kind: "transform" }>["transform"],
  input?: unknown
) =>
  makeEffect<TSuccess, TError, TRequirements>({
    kind: "transform",
    transform: name,
    source,
    input,
  });

const effectFacade: HabitatEffectFacade = {
  succeed: <T>(value: T) => makeEffect<T>({ kind: "succeed", value }),
  fail: <E>(error: E) => makeEffect<never, E>({ kind: "fail", error }),
  gen: <TSuccess, TError = never, TRequirements = never>(
    body: () => Generator<unknown, TSuccess, unknown>
  ) => makeEffect<TSuccess, TError, TRequirements>({ kind: "gen", body }),
  tryPromise: <TSuccess, TError>(input: {
    readonly try: () => Promise<TSuccess> | TSuccess;
    readonly catch: (cause: unknown) => TError;
  }) =>
    makeEffect<TSuccess, TError>({ kind: "try-promise", attempt: input.try, recover: input.catch }),
  all: <const TEffects extends Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>>(
    effects: TEffects,
    options?: { readonly concurrency?: number | "unbounded"; readonly discard?: boolean }
  ) =>
    makeEffect<
      HabitatEffectSuccessRecord<TEffects>,
      HabitatEffectErrorUnion<TEffects>,
      HabitatEffectRequirementUnion<TEffects>
    >({
      kind: "all",
      effects: Object.freeze({ ...effects }),
      ...options,
    }),
  timeout: (effect, duration) => transform(effect, "timeout", duration),
  retry: (effect, policy) => transform(effect, "retry", Object.freeze({ ...policy })),
  mapError: (effect, map) => transform(effect, "map-error", map),
  catchTag: (effect, tag, handler) =>
    transform(effect, "catch-tag", Object.freeze({ tag, handler })),
  catchTags: (effect, handlers) => transform(effect, "catch-tags", Object.freeze({ ...handlers })),
  orElse: (effect, fallback) => transform(effect, "or-else", fallback),
  match: (effect, handlers) => transform(effect, "match", Object.freeze({ ...handlers })),
  withSpan: (name, effect, attributes) =>
    transform(
      effect,
      "span",
      Object.freeze({ name, attributes: Object.freeze({ ...attributes }) })
    ),
  interruptible: (effect) => transform(effect, "interruptible"),
};

export const Effect: HabitatEffectFacade = Object.freeze(effectFacade);

export type TaggedErrorConstructor<TTag extends string> = new <
  TFields extends Record<string, unknown> = Record<never, never>,
>(
  fields: keyof TFields extends never ? void : TFields
) => TFields & { readonly _tag: TTag };

export function TaggedError<const TTag extends string>(tag: TTag): TaggedErrorConstructor<TTag> {
  class HabitatTaggedError {
    readonly _tag = tag;

    constructor(fields?: Record<string, unknown>) {
      if (fields !== undefined) Object.assign(this, fields);
      Object.freeze(this);
    }
  }

  return HabitatTaggedError as TaggedErrorConstructor<TTag>;
}
