import { Effect, type RawrEffect, type RawrEffectYield } from "../../effect";

export const PROVIDER_EFFECT_PLAN: unique symbol = Symbol("provider.effect-plan");

export type ProviderEffectBoundaryKind = "provider.acquire" | "provider.release";

export type ProviderAcquire<TValue, TError = never, TRequirements = never> =
  () =>
    | RawrEffect<TValue, TError, TRequirements>
    | Generator<RawrEffectYield<TError, TRequirements>, TValue, unknown>;

export type ProviderRelease<TValue, TError = never, TRequirements = never> =
  (value: TValue) =>
    | RawrEffect<void, TError, TRequirements>
    | Generator<RawrEffectYield<TError, TRequirements>, void, unknown>;

export interface ProviderEffectPlanInternals<TValue = unknown, TError = never> {
  readonly acquire: ProviderAcquire<TValue, TError, never>;
  readonly release?: ProviderRelease<TValue, unknown, never>;
  readonly span?: {
    readonly name: string;
    readonly attributes?: Record<string, string | number | boolean>;
  };
}

export interface ProviderEffectPlan<TValue, TError = never> {
  readonly kind: "provider.effect-plan";
  readonly boundary: ProviderEffectBoundaryKind;
  readonly [PROVIDER_EFFECT_PLAN]?: ProviderEffectPlanInternals<TValue, TError>;
}

export interface ProviderFx {
  acquireRelease<TValue>(input: {
    readonly acquire: ProviderAcquire<TValue>;
    readonly release?: ProviderRelease<TValue>;
  }): ProviderEffectPlan<TValue>;

  tryAcquire<TValue, TError>(input: {
    readonly acquire: () => Promise<TValue> | TValue;
    readonly catch: (cause: unknown) => TError;
  }): ProviderEffectPlan<TValue, TError>;

  withSpan<TValue, TError>(
    name: string,
    plan: ProviderEffectPlan<TValue, TError>,
    attributes?: Record<string, string | number | boolean>,
  ): ProviderEffectPlan<TValue, TError>;
}

function createProviderEffectPlan<TValue, TError = never>(
  internals: ProviderEffectPlanInternals<TValue, TError>,
): ProviderEffectPlan<TValue, TError> {
  return {
    kind: "provider.effect-plan",
    boundary: "provider.acquire",
    [PROVIDER_EFFECT_PLAN]: internals,
  };
}

export const providerFx: ProviderFx = {
  acquireRelease(input) {
    return createProviderEffectPlan(input);
  },

  tryAcquire<TValue, TError>(input: {
    readonly acquire: () => Promise<TValue> | TValue;
    readonly catch: (cause: unknown) => TError;
  }): ProviderEffectPlan<TValue, TError> {
    return createProviderEffectPlan({
      acquire: () =>
        Effect.tryPromise({
          try: () => Promise.resolve(input.acquire()),
          catch: input.catch,
        }) as RawrEffect<TValue, TError, never>,
    });
  },

  withSpan<TValue, TError>(
    name: string,
    plan: ProviderEffectPlan<TValue, TError>,
    attributes?: Record<string, string | number | boolean>,
  ): ProviderEffectPlan<TValue, TError> {
    return {
      ...plan,
      [PROVIDER_EFFECT_PLAN]: {
        ...plan[PROVIDER_EFFECT_PLAN],
        span: { name, attributes },
      } as ProviderEffectPlanInternals<TValue, TError>,
    } as ProviderEffectPlan<TValue, TError>;
  },
};
