import type { RuntimeSchema } from "../runtime/schema";
import type { ResourceRequirement, RuntimeResource } from "../runtime/resources";

export interface ResourceDependency<
  TResource extends RuntimeResource = RuntimeResource,
> {
  readonly kind: "service.resource-dep";
  readonly resource: TResource;
  readonly optional?: boolean;
  readonly instance?: string;
  readonly reason?: string;
}

export interface ServiceDependency<TService = unknown> {
  readonly kind: "service.service-dep";
  readonly service: TService;
  readonly instance?: string;
  readonly reason?: string;
}

export interface SemanticDependency<TId extends string = string> {
  readonly kind: "service.semantic-dep";
  readonly id: TId;
  readonly reason?: string;
}

export type ServiceDeps = Record<
  string,
  ResourceDependency | ServiceDependency | SemanticDependency
>;

export interface ServiceDefinition<
  TId extends string = string,
  TDeps extends ServiceDeps = ServiceDeps,
  TScope = unknown,
  TConfig = unknown,
  TInvocation = unknown,
> {
  readonly kind: "service.definition";
  readonly id: TId;
  readonly deps: TDeps;
  readonly scope?: RuntimeSchema<TScope>;
  readonly config?: RuntimeSchema<TConfig>;
  readonly invocation?: RuntimeSchema<TInvocation>;
  readonly metadataDefaults?: Record<string, unknown>;
  readonly baseline?: Record<string, unknown>;
}

export type ServiceOf<TService extends ServiceDefinition> = TService;

export interface ServiceUse<TService extends ServiceDefinition = ServiceDefinition> {
  readonly kind: "service.use";
  readonly service: TService;
}

export type ServiceUses = Record<string, ServiceUse<ServiceDefinition>>;

export function resourceDep<const TResource extends RuntimeResource>(
  resource: TResource,
  options: Omit<ResourceDependency<TResource>, "kind" | "resource"> = {},
): ResourceDependency<TResource> {
  return {
    kind: "service.resource-dep",
    resource,
    ...options,
  };
}

export function serviceDep<const TService extends ServiceDefinition>(
  service: TService,
  options: Omit<ServiceDependency<TService>, "kind" | "service"> = {},
): ServiceDependency<TService> {
  return {
    kind: "service.service-dep",
    service,
    ...options,
  };
}

export function semanticDep<const TId extends string>(
  input: TId | { readonly id: TId; readonly reason?: string },
): SemanticDependency<TId> {
  return {
    kind: "service.semantic-dep",
    id: typeof input === "string" ? input : input.id,
    reason: typeof input === "string" ? undefined : input.reason,
  };
}

export function defineService<
  const TId extends string,
  const TDeps extends ServiceDeps = {},
  TScope = unknown,
  TConfig = unknown,
  TInvocation = unknown,
>(input: {
  readonly id: TId;
  readonly deps?: TDeps;
  readonly scope?: RuntimeSchema<TScope>;
  readonly config?: RuntimeSchema<TConfig>;
  readonly invocation?: RuntimeSchema<TInvocation>;
  readonly metadataDefaults?: Record<string, unknown>;
  readonly baseline?: Record<string, unknown>;
}): ServiceDefinition<TId, TDeps, TScope, TConfig, TInvocation> {
  return {
    kind: "service.definition",
    id: input.id,
    deps: input.deps ?? ({} as TDeps),
    scope: input.scope,
    config: input.config,
    invocation: input.invocation,
    metadataDefaults: input.metadataDefaults,
    baseline: input.baseline,
  };
}

export function useService<const TService extends ServiceDefinition>(
  service: TService,
): ServiceUse<TService> {
  return {
    kind: "service.use",
    service,
  };
}

export function toResourceRequirement(
  dependency: ResourceDependency,
  reason = dependency.reason ?? "service dependency",
): ResourceRequirement {
  return {
    resource: dependency.resource,
    optional: dependency.optional,
    instance: dependency.instance,
    reason,
  };
}
