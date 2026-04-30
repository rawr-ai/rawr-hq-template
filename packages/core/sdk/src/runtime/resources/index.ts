import type { RuntimeSchema } from "../schema";

const RUNTIME_RESOURCE_VALUE: unique symbol = Symbol("runtime.resource.value");

export type ResourceLifetime = "process" | "role" | "surface";

export type AppRole = "server" | "async" | "cli" | "web" | "agent" | "desktop";

export interface RuntimeDiagnosticContributor<TValue = unknown> {
  snapshot(value: TValue): Record<string, string | number | boolean | null>;
}

export interface RuntimeResource<
  TId extends string = string,
  TValue = unknown,
  TConfig = never,
> {
  readonly kind: "runtime.resource";
  readonly id: TId;
  readonly title: string;
  readonly purpose: string;
  readonly defaultLifetime?: ResourceLifetime;
  readonly allowedLifetimes?: readonly ResourceLifetime[];
  readonly configSchema?: RuntimeSchema<TConfig>;
  readonly diagnosticContributor?: RuntimeDiagnosticContributor<TValue>;
  readonly [RUNTIME_RESOURCE_VALUE]?: {
    readonly value: TValue;
    readonly config: TConfig;
  };
}

export type RuntimeResourceValue<TResource extends RuntimeResource> =
  TResource extends RuntimeResource<string, infer TValue, unknown> ? TValue : never;

export interface ResourceRequirement<
  TResource extends RuntimeResource = RuntimeResource,
> {
  readonly resource: TResource;
  readonly lifetime?: ResourceLifetime;
  readonly role?: AppRole;
  readonly optional?: boolean;
  readonly instance?: string;
  readonly reason: string;
}

export function defineRuntimeResource<
  const TId extends string,
  TValue,
  TConfig = never,
>(input: {
  readonly id: TId;
  readonly title: string;
  readonly purpose: string;
  readonly defaultLifetime?: ResourceLifetime;
  readonly allowedLifetimes?: readonly ResourceLifetime[];
  readonly configSchema?: RuntimeSchema<TConfig>;
  readonly diagnosticContributor?: RuntimeDiagnosticContributor<TValue>;
}): RuntimeResource<TId, TValue, TConfig> {
  return {
    kind: "runtime.resource",
    ...input,
  };
}

export function resourceRequirement<const TResource extends RuntimeResource>(
  resource: TResource,
  options: Omit<ResourceRequirement<TResource>, "resource">,
): ResourceRequirement<TResource> {
  return {
    ...options,
    resource,
  };
}
