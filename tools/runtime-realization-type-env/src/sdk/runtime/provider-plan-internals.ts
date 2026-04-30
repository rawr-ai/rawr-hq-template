import { Effect as VendorEffect } from "effect";
import type { RawrEffect } from "../effect";
import type {
  ProviderAcquire,
  ProviderEffectPlan,
  ProviderRelease,
} from "./providers";

export interface ProviderEffectPlanInternals<TValue = unknown, TError = unknown> {
  readonly acquire: () => RawrEffect<TValue, TError, never>;
  readonly release?: (value: TValue) => RawrEffect<void, unknown, never>;
}

/**
 * Lab-internal bridge from the intentionally opaque public provider plan to the
 * contained provisioning path. This is not final ProviderEffectPlan shape.
 */
const providerPlanInternals = new WeakMap<
  object,
  ProviderEffectPlanInternals<any, any>
>();

function providerBodyToEffect<TValue, TError>(
  body: ReturnType<ProviderAcquire<TValue>>,
): RawrEffect<TValue, TError, never> {
  if (VendorEffect.isEffect(body)) {
    return body as RawrEffect<TValue, TError, never>;
  }

  return VendorEffect.gen(function* () {
    return yield* (body as Generator<any, TValue, unknown>);
  }) as RawrEffect<TValue, TError, never>;
}

function providerReleaseToEffect<TValue>(
  release: ProviderRelease<TValue>,
  value: TValue,
): RawrEffect<void, unknown, never> {
  const body = release(value);
  if (VendorEffect.isEffect(body)) {
    return body as RawrEffect<void, unknown, never>;
  }

  return VendorEffect.gen(function* () {
    return yield* (body as Generator<any, void, unknown>);
  }) as RawrEffect<void, unknown, never>;
}

export function createProviderEffectPlan<TValue, TError = never>(input: {
  readonly acquire: ProviderAcquire<TValue>;
  readonly release?: ProviderRelease<TValue>;
}): ProviderEffectPlan<TValue, TError> {
  // The public plan object stays opaque while the lab SDK records private
  // acquire/release hooks for contained lowering. Production may replace this
  // storage shape once telemetry, refresh, and config-source semantics settle.
  const plan = {
    kind: "provider.effect-plan",
    boundary: "provider.acquire",
  } satisfies ProviderEffectPlan<TValue, TError>;

  providerPlanInternals.set(plan, {
    acquire: () => providerBodyToEffect<TValue, TError>(input.acquire()),
    release: input.release
      ? (value) => providerReleaseToEffect(input.release as ProviderRelease<TValue>, value)
      : undefined,
  });

  return plan;
}

export function createTryProviderEffectPlan<TValue, TError>(input: {
  readonly acquire: () => Promise<TValue> | TValue;
  readonly catch: (cause: unknown) => TError;
}): ProviderEffectPlan<TValue, TError> {
  // Promise-backed acquisition is normalized into RawrEffect for the mini
  // provisioning path only; this does not bless provider retry/backoff,
  // cancellation, or diagnostic payload policy.
  const plan = {
    kind: "provider.effect-plan",
    boundary: "provider.acquire",
  } satisfies ProviderEffectPlan<TValue, TError>;

  providerPlanInternals.set(plan, {
    acquire: () =>
      VendorEffect.tryPromise({
        try: async () => input.acquire(),
        catch: input.catch,
      }) as RawrEffect<TValue, TError, never>,
  });

  return plan;
}

/**
 * Reads the private lowering payload when a plan was produced by this lab SDK.
 * Absence is a fail-closed signal for plans this lab runtime cannot lower.
 */
export function readProviderEffectPlanInternals<TValue, TError>(
  plan: ProviderEffectPlan<TValue, TError>,
): ProviderEffectPlanInternals<TValue, TError> | undefined {
  return providerPlanInternals.get(plan as object);
}
