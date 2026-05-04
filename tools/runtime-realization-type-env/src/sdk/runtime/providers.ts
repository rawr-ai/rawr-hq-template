import type { RawrEffect, RawrEffectYield } from "../effect";
import {
  createProviderEffectPlan,
  createTryProviderEffectPlan,
} from "./provider-plan-internals";
import type { RuntimeSchema } from "./schema";
import type {
  ResourceRequirement,
  RuntimeResource,
  RuntimeResourceValue,
} from "./resources";

const PROVIDER_PLAN_VALUE: unique symbol = Symbol("provider.effect-plan.value");

export interface ProviderEffectPlan<TValue, TError = never> {
  readonly kind: "provider.effect-plan";
  readonly boundary: "provider.acquire" | "provider.release";
  readonly [PROVIDER_PLAN_VALUE]?: {
    readonly value: TValue;
    readonly error: TError;
  };
}

export interface RuntimeDiagnosticSink {
  report(message: string): void;
}

export interface RuntimeTelemetry {
  event(name: string, attributes?: Record<string, string | number | boolean>): void;
}

export interface ProviderScope {
  readonly processId: string;
  readonly role?: string;
}

export type RuntimeResourceMap = ReadonlyMap<string, unknown>;

export interface ProviderBuildContext<TConfig> {
  readonly config: TConfig;
  readonly resources: RuntimeResourceMap;
  readonly scope: ProviderScope;
  readonly telemetry: RuntimeTelemetry;
  readonly diagnostics: RuntimeDiagnosticSink;
}

export type ProviderAcquire<TValue> =
  () => RawrEffect<TValue> | Generator<RawrEffectYield<unknown, unknown>, TValue, unknown>;

export type ProviderRelease<TValue> =
  (value: TValue) => RawrEffect<void> | Generator<RawrEffectYield<unknown, unknown>, void, unknown>;

export interface RuntimeProvider<
  TResource extends RuntimeResource<unknown> = RuntimeResource<unknown>,
  TConfig = unknown,
> {
  readonly kind: "runtime.provider";
  readonly id: string;
  readonly title: string;
  readonly provides: TResource;
  readonly requires: readonly ResourceRequirement[];
  readonly configSchema?: RuntimeSchema<TConfig>;
  build(
    input: ProviderBuildContext<TConfig>,
  ): ProviderEffectPlan<RuntimeResourceValue<TResource>>;
}

export function defineRuntimeProvider<
  const TResource extends RuntimeResource<unknown>,
  TConfig = unknown,
>(
  input: RuntimeProvider<TResource, TConfig>,
): RuntimeProvider<TResource, TConfig> {
  return input;
}

export const providerFx = {
  acquireRelease<TValue>(input: {
    readonly acquire: ProviderAcquire<TValue>;
    readonly release?: ProviderRelease<TValue>;
  }): ProviderEffectPlan<TValue> {
    return createProviderEffectPlan(input);
  },

  tryAcquire<TValue, TError>(input: {
    readonly acquire: () => Promise<TValue> | TValue;
    readonly catch: (cause: unknown) => TError;
  }): ProviderEffectPlan<TValue, TError> {
    return createTryProviderEffectPlan(input);
  },

  withSpan<TValue, TError>(
    name: string,
    plan: ProviderEffectPlan<TValue, TError>,
    attributes?: Record<string, string | number | boolean>,
  ): ProviderEffectPlan<TValue, TError> {
    void name;
    void attributes;
    return plan;
  },
};
