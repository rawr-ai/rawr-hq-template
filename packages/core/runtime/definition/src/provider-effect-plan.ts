import { Effect, type HabitatEffect, type HabitatTelemetryAttributes } from "./effect";
import type { EffectExecutionPolicy } from "./execution";

export type ProviderFx<TValue, TError = never> = HabitatEffect<TValue, TError, never>;

export type ProviderAcquire<TValue, TError = never> = ProviderFx<TValue, TError>;

export type ProviderRelease<TValue> = (value: TValue) => ProviderFx<void, never>;

const providerEffectPlanWitness = Symbol("provider.effect-plan.witness");
const providerEffectPlanRegistry = new WeakMap<object, object>();

interface ProviderEffectPlanWitness<TValue, TAcquireError> {
  readonly acquire: ProviderAcquire<TValue, TAcquireError>;
  readonly release: ProviderRelease<TValue>;
}

export interface ProviderEffectPlan<TValue, TAcquireError = never> {
  readonly kind: "provider.effect-plan";
  readonly acquire: {
    readonly boundary: "provider.acquire";
    readonly policy: EffectExecutionPolicy | undefined;
    readonly telemetry: HabitatTelemetryAttributes | undefined;
  };
  readonly release: {
    readonly boundary: "provider.release";
    readonly policy: EffectExecutionPolicy | undefined;
    readonly telemetry: HabitatTelemetryAttributes | undefined;
  };
  readonly [providerEffectPlanWitness]: ProviderEffectPlanWitness<TValue, TAcquireError>;
}

export interface ProviderFxFacade {
  succeed<TValue>(value: TValue): ProviderFx<TValue>;

  tryPromise<TValue, TError>(input: {
    readonly try: () => Promise<TValue> | TValue;
    readonly catch: (cause: unknown) => TError;
  }): ProviderFx<TValue, TError>;

  acquireRelease<TValue, TAcquireError = never>(input: {
    readonly acquire: ProviderAcquire<TValue, TAcquireError>;
    readonly release: ProviderRelease<TValue>;
    readonly policy?: {
      readonly acquire?: EffectExecutionPolicy;
      readonly release?: EffectExecutionPolicy;
    };
    readonly telemetry?: {
      readonly acquire?: HabitatTelemetryAttributes;
      readonly release?: HabitatTelemetryAttributes;
    };
  }): ProviderEffectPlan<TValue, TAcquireError>;
}

function copyEffectExecutionPolicy(
  policy: EffectExecutionPolicy | undefined
): EffectExecutionPolicy | undefined {
  if (policy === undefined) return undefined;

  const retry =
    policy.retry === undefined
      ? undefined
      : Object.freeze({
          ...(policy.retry.times === undefined ? {} : { times: policy.retry.times }),
          ...(policy.retry.backoff === undefined ? {} : { backoff: policy.retry.backoff }),
          ...(policy.retry.delay === undefined ? {} : { delay: policy.retry.delay }),
        });
  const timeout =
    policy.timeout === undefined ? undefined : Object.freeze({ duration: policy.timeout.duration });

  return Object.freeze({
    ...(retry === undefined ? {} : { retry }),
    ...(timeout === undefined ? {} : { timeout }),
    ...(policy.interruptible === undefined ? {} : { interruptible: policy.interruptible }),
  });
}

function copyTelemetryAttributes(
  telemetry: HabitatTelemetryAttributes | undefined
): HabitatTelemetryAttributes | undefined {
  return telemetry === undefined ? undefined : Object.freeze({ ...telemetry });
}

function acquireRelease<TValue, TAcquireError = never>(input: {
  readonly acquire: ProviderAcquire<TValue, TAcquireError>;
  readonly release: ProviderRelease<TValue>;
  readonly policy?: {
    readonly acquire?: EffectExecutionPolicy;
    readonly release?: EffectExecutionPolicy;
  };
  readonly telemetry?: {
    readonly acquire?: HabitatTelemetryAttributes;
    readonly release?: HabitatTelemetryAttributes;
  };
}): ProviderEffectPlan<TValue, TAcquireError> {
  const witness: ProviderEffectPlanWitness<TValue, TAcquireError> = Object.freeze({
    acquire: input.acquire,
    release: input.release,
  });
  const plan: ProviderEffectPlan<TValue, TAcquireError> = {
    kind: "provider.effect-plan",
    acquire: Object.freeze({
      boundary: "provider.acquire",
      policy: copyEffectExecutionPolicy(input.policy?.acquire),
      telemetry: copyTelemetryAttributes(input.telemetry?.acquire),
    }),
    release: Object.freeze({
      boundary: "provider.release",
      policy: copyEffectExecutionPolicy(input.policy?.release),
      telemetry: copyTelemetryAttributes(input.telemetry?.release),
    }),
    [providerEffectPlanWitness]: witness,
  };

  Object.defineProperty(plan, providerEffectPlanWitness, {
    configurable: false,
    enumerable: false,
    value: witness,
    writable: false,
  });

  const frozenPlan = Object.freeze(plan);
  providerEffectPlanRegistry.set(frozenPlan, witness);
  return frozenPlan;
}

export const providerFx: ProviderFxFacade = Object.freeze({
  succeed: Effect.succeed,
  tryPromise: Effect.tryPromise,
  acquireRelease,
});

export function readProviderEffectPlan<TValue, TAcquireError>(
  plan: ProviderEffectPlan<TValue, TAcquireError>
): ProviderEffectPlanWitness<TValue, TAcquireError> {
  const descriptor = Object.getOwnPropertyDescriptor(plan, providerEffectPlanWitness);
  const registeredWitness = providerEffectPlanRegistry.get(plan);
  if (
    descriptor === undefined ||
    !("value" in descriptor) ||
    descriptor.configurable !== false ||
    descriptor.enumerable !== false ||
    descriptor.writable !== false ||
    registeredWitness === undefined ||
    descriptor.value !== registeredWitness
  ) {
    throw new TypeError("A provider Effect plan must carry its private construction witness.");
  }

  return plan[providerEffectPlanWitness];
}
