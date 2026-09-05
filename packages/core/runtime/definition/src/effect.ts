import { Effect as NativeEffect, Schedule } from "effect";

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

export type HabitatEffect<TSuccess, TError = never, TRequirements = never> = NativeEffect.Effect<
  TSuccess,
  TError,
  TRequirements
>;

export type HabitatEffectYieldIterator<
  TSuccess,
  TError = never,
  TRequirements = never,
> = NativeEffect.EffectIterator<HabitatEffect<TSuccess, TError, TRequirements>>;

/** Private owners admit the vendor value without wrapping or inspecting its program. */
export const isHabitatEffect: (
  value: unknown
) => value is HabitatEffect<unknown, unknown, unknown> = NativeEffect.isEffect;

type HabitatEffectSuccess<T> =
  T extends HabitatEffect<infer TSuccess, unknown, unknown> ? TSuccess : never;
type HabitatEffectError<T> =
  T extends HabitatEffect<unknown, infer TError, unknown> ? TError : never;
type HabitatEffectRequirements<T> =
  T extends HabitatEffect<unknown, unknown, infer TRequirements> ? TRequirements : never;

type HabitatEffectErrorTag<TError> =
  Extract<TError, { readonly _tag: string }> extends infer TTaggedError
    ? TTaggedError extends { readonly _tag: infer TTag extends string }
      ? TTag
      : never
    : never;

type HabitatCatchTagsHandlers<TError> = {
  readonly [TTag in HabitatEffectErrorTag<TError>]?: (
    error: Extract<TError, { readonly _tag: TTag }>
  ) => HabitatEffect<unknown, unknown, unknown>;
};

type HabitatCatchTagsHandlerEffect<THandler> = THandler extends (error: never) => infer TEffect
  ? TEffect
  : never;

type HabitatCatchTagsSuccess<THandlers> = HabitatEffectSuccess<
  HabitatCatchTagsHandlerEffect<THandlers[keyof THandlers]>
>;

type HabitatCatchTagsError<THandlers> = HabitatEffectError<
  HabitatCatchTagsHandlerEffect<THandlers[keyof THandlers]>
>;

type HabitatCatchTagsRequirements<THandlers> = HabitatEffectRequirements<
  HabitatCatchTagsHandlerEffect<THandlers[keyof THandlers]>
>;

type HabitatHandledTags<THandlers> = {
  [TTag in keyof THandlers]-?: THandlers[TTag] extends (
    error: never
  ) => HabitatEffect<unknown, unknown, unknown>
    ? TTag
    : never;
}[keyof THandlers];

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
  gen<TYieldedEffect extends HabitatEffect<unknown, unknown, unknown>, TSuccess, TNext>(
    body: () => Generator<TYieldedEffect, TSuccess, TNext>
  ): HabitatEffect<
    TSuccess,
    HabitatEffectError<TYieldedEffect>,
    HabitatEffectRequirements<TYieldedEffect>
  >;
  tryPromise<TSuccess, TError>(input: {
    readonly try: () => Promise<TSuccess> | TSuccess;
    readonly catch: (cause: unknown) => TError;
  }): HabitatEffect<TSuccess, TError>;
  all<
    const TEffects extends Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>,
    const TDiscard extends boolean = false,
  >(
    effects: TEffects,
    options?: {
      readonly concurrency?: number | "unbounded";
      readonly discard?: TDiscard;
    }
  ): HabitatEffect<
    TDiscard extends true ? void : HabitatEffectSuccessRecord<TEffects>,
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
  catchTag<
    TSuccess,
    TError,
    const TTag extends HabitatEffectErrorTag<TError>,
    TNextSuccess,
    TNextError,
    TRequirements,
    TNextRequirements,
  >(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    tag: TTag,
    handler: (
      error: Extract<TError, { readonly _tag: TTag }>
    ) => HabitatEffect<TNextSuccess, TNextError, TNextRequirements>
  ): HabitatEffect<
    TSuccess | TNextSuccess,
    Exclude<TError, { readonly _tag: TTag }> | TNextError,
    TRequirements | TNextRequirements
  >;
  catchTags<
    TSuccess,
    TError,
    TRequirements,
    const THandlers extends HabitatCatchTagsHandlers<TError> & {
      readonly [TTag in Exclude<keyof THandlers, HabitatEffectErrorTag<TError>>]: never;
    },
  >(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    handlers: THandlers
  ): HabitatEffect<
    TSuccess | HabitatCatchTagsSuccess<THandlers>,
    | Exclude<TError, { readonly _tag: HabitatHandledTags<THandlers> }>
    | HabitatCatchTagsError<THandlers>,
    TRequirements | HabitatCatchTagsRequirements<THandlers>
  >;
  orElse<TSuccess, TError, TNextSuccess, TNextError, TRequirements, TNextRequirements>(
    effect: HabitatEffect<TSuccess, TError, TRequirements>,
    fallback: (error: TError) => HabitatEffect<TNextSuccess, TNextError, TNextRequirements>
  ): HabitatEffect<TSuccess | TNextSuccess, TNextError, TRequirements | TNextRequirements>;
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

function milliseconds(value: HabitatDurationInput): number {
  let amount: number;
  if (typeof value === "number") {
    amount = value;
  } else {
    const suffix = [" ms", " seconds", " minutes"].find((unit) => value.endsWith(unit));
    if (suffix === undefined) throw new TypeError("Invalid Habitat duration.");
    const quantity = value.slice(0, -suffix.length);
    const multiplier = suffix === " minutes" ? 60_000 : suffix === " seconds" ? 1_000 : 1;
    if (quantity.trim().length === 0) throw new TypeError("Invalid Habitat duration.");
    amount = Number(quantity) * multiplier;
  }
  if (!Number.isFinite(amount) || amount < 0) throw new TypeError("Invalid Habitat duration.");
  return amount;
}

function timeout<A, E, R>(
  effect: HabitatEffect<A, E, R>,
  duration: HabitatDurationInput
): HabitatEffect<A, E | HabitatTimeoutError, R> {
  return NativeEffect.suspend(() => {
    const error: HabitatTimeoutError = Object.freeze({ _tag: "HabitatTimeoutError", duration });
    return NativeEffect.timeoutOrElse(effect, {
      duration: milliseconds(duration),
      orElse: () => NativeEffect.fail(error),
    });
  });
}

function retry<A, E, R>(
  effect: HabitatEffect<A, E, R>,
  input: HabitatRetryPolicy
): HabitatEffect<A, E, R> {
  const policy = { ...input };
  return NativeEffect.suspend(() => {
    const times = policy.times === undefined ? 0 : policy.times;
    if (!Number.isFinite(times) || !Number.isInteger(times) || times < 0) {
      throw new TypeError("Retry times must be a finite nonnegative integer.");
    }
    if (
      policy.backoff !== undefined &&
      policy.backoff !== "none" &&
      policy.backoff !== "fixed" &&
      policy.backoff !== "exponential"
    ) {
      throw new TypeError("Invalid Habitat retry backoff.");
    }
    if (
      (policy.backoff === "fixed" || policy.backoff === "exponential") &&
      policy.delay === undefined
    ) {
      throw new TypeError("A delayed retry policy must declare its delay.");
    }
    const delay = policy.delay === undefined ? 0 : milliseconds(policy.delay);
    const schedule =
      policy.backoff === "exponential"
        ? Schedule.exponential(delay)
        : Schedule.spaced(policy.backoff === "none" ? 0 : delay);
    return NativeEffect.retry(effect, { times, schedule });
  });
}

function all<
  const TEffects extends Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>,
  const TDiscard extends boolean = false,
>(
  effects: TEffects,
  options?: { readonly concurrency?: number | "unbounded"; readonly discard?: TDiscard }
): HabitatEffect<
  TDiscard extends true ? void : HabitatEffectSuccessRecord<TEffects>,
  HabitatEffectErrorUnion<TEffects>,
  HabitatEffectRequirementUnion<TEffects>
>;
function all(
  effects: Readonly<Record<string, HabitatEffect<unknown, unknown, unknown>>>,
  options?: { readonly concurrency?: number | "unbounded"; readonly discard?: boolean }
): HabitatEffect<Readonly<Record<string, unknown>> | void, unknown, unknown> {
  const concurrency = options?.concurrency;
  const discard = options?.discard;
  const entries = Object.entries(effects).map(([key, effect]) =>
    NativeEffect.map(effect, (value): readonly [string, unknown] => [key, value])
  );
  return NativeEffect.suspend<Readonly<Record<string, unknown>> | void, unknown, unknown>(() => {
    if (
      concurrency !== undefined &&
      concurrency !== "unbounded" &&
      (!Number.isFinite(concurrency) || !Number.isInteger(concurrency) || concurrency < 1)
    ) {
      throw new TypeError("Concurrency must be a positive integer or unbounded.");
    }
    if (discard) return NativeEffect.all(entries, { concurrency, discard: true });
    // Native record collection assigns into {}, losing an own __proto__ result key.
    return NativeEffect.map(NativeEffect.all(entries, { concurrency }), Object.fromEntries);
  });
}

function catchTags<
  TSuccess,
  TError,
  TRequirements,
  const THandlers extends HabitatCatchTagsHandlers<TError> & {
    readonly [TTag in Exclude<keyof THandlers, HabitatEffectErrorTag<TError>>]: never;
  },
>(
  effect: HabitatEffect<TSuccess, TError, TRequirements>,
  handlers: THandlers
): HabitatEffect<
  TSuccess | HabitatCatchTagsSuccess<THandlers>,
  | Exclude<TError, { readonly _tag: HabitatHandledTags<THandlers> }>
  | HabitatCatchTagsError<THandlers>,
  TRequirements | HabitatCatchTagsRequirements<THandlers>
>;
function catchTags(
  effect: HabitatEffect<unknown, unknown, unknown>,
  handlers: Readonly<
    Record<string, ((error: never) => HabitatEffect<unknown, unknown, unknown>) | undefined>
  >
): HabitatEffect<unknown, unknown, unknown> {
  const present = Object.fromEntries(
    Object.entries(handlers).filter(([, handler]) => handler !== undefined)
  );
  return NativeEffect.catchTags(effect, present);
}

const effectFacade: HabitatEffectFacade = {
  succeed: NativeEffect.succeed,
  fail: NativeEffect.fail,
  gen: NativeEffect.gen,
  tryPromise: ({ try: attempt, catch: recover }) =>
    NativeEffect.tryPromise({ try: () => Promise.resolve(attempt()), catch: recover }),
  all,
  timeout,
  retry,
  mapError: NativeEffect.mapError,
  catchTag: NativeEffect.catchTag,
  catchTags,
  orElse: NativeEffect.catch,
  match: (effect, handlers) => NativeEffect.match(effect, { ...handlers }),
  withSpan: (name, effect, attributes) =>
    NativeEffect.withSpan(effect, name, { attributes: { ...attributes } }),
  interruptible: NativeEffect.interruptible,
};

export const Effect: HabitatEffectFacade = Object.freeze(effectFacade);

export type TaggedErrorConstructor<TTag extends string> = new <
  TFields extends Record<string, unknown> & { readonly _tag?: never } = Record<never, never>,
>(
  fields: keyof TFields extends never ? void : TFields
) => TFields & { readonly _tag: TTag };

export function TaggedError<const TTag extends string>(tag: TTag): TaggedErrorConstructor<TTag> {
  class HabitatTaggedError {
    constructor(fields?: Record<string, unknown>) {
      if (fields !== undefined) Object.assign(this, fields);
      Object.defineProperty(this, "_tag", {
        configurable: false,
        enumerable: true,
        value: tag,
        writable: false,
      });
      Object.freeze(this);
    }
  }

  return HabitatTaggedError as TaggedErrorConstructor<TTag>;
}
