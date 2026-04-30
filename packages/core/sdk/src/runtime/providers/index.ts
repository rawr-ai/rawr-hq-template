import type { RuntimeSchema } from "../schema";
import type {
  ResourceRequirement,
  RuntimeResource,
  RuntimeResourceValue,
} from "../resources";
import type { ProviderEffectPlan } from "./effect";

export interface RuntimeDiagnosticSink {
  report(message: string, attributes?: Record<string, string | number | boolean>): void;
}

export interface RuntimeTelemetry {
  event(name: string, attributes?: Record<string, string | number | boolean>): void;
}

export interface ProviderScope {
  readonly processId: string;
  readonly role?: string;
  readonly surface?: string;
  readonly capability?: string;
}

export type RuntimeResourceMap = ReadonlyMap<string, unknown>;

export interface RuntimeProviderHealthDescriptor {
  readonly kind: "runtime.provider-health";
  readonly checkId: string;
}

export interface ProviderBuildContext<TConfig> {
  readonly config: TConfig;
  readonly resources: RuntimeResourceMap;
  readonly scope: ProviderScope;
  readonly telemetry: RuntimeTelemetry;
  readonly diagnostics: RuntimeDiagnosticSink;
}

export interface RuntimeProvider<
  TResource extends RuntimeResource = RuntimeResource,
  TConfig = never,
> {
  readonly kind: "runtime.provider";
  readonly id: string;
  readonly title: string;
  readonly provides: TResource;
  readonly requires: readonly ResourceRequirement[];
  readonly configSchema?: RuntimeSchema<TConfig>;
  readonly defaultConfigKey?: string;
  readonly health?: RuntimeProviderHealthDescriptor;
  build(
    input: ProviderBuildContext<TConfig>,
  ): ProviderEffectPlan<RuntimeResourceValue<TResource>>;
}

export function defineRuntimeProvider<
  const TResource extends RuntimeResource,
  TConfig = never,
>(
  input: RuntimeProvider<TResource, TConfig>,
): RuntimeProvider<TResource, TConfig> {
  return input;
}

export type { ProviderEffectPlan } from "./effect";
