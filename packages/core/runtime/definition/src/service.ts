import { oc } from "@orpc/contract";
import { implement, os } from "@orpc/server";

import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { RuntimeResource } from "./resource";

const createMiddleware: typeof os.middleware = os.middleware.bind(os);

export interface ResourceDependency<TResource extends RuntimeResource = RuntimeResource> {
  readonly kind: "service.dependency.resource";
  readonly resource: TResource;
}

export interface ServiceDependency<TService extends ServiceDefinition = ServiceDefinition> {
  readonly kind: "service.dependency.service";
  readonly service: TService;
}

export interface SemanticDependency {
  readonly kind: "service.dependency.semantic";
  readonly adapterId: string;
}

export type ServiceDependencyDeclaration =
  | ResourceDependency
  | ServiceDependency
  | SemanticDependency;

export const resourceDep = <const TResource extends RuntimeResource>(
  resource: TResource
): ResourceDependency<TResource> =>
  Object.freeze({ kind: "service.dependency.resource", resource });

export const serviceDep = <const TService extends ServiceDefinition>(
  service: TService
): ServiceDependency<TService> => Object.freeze({ kind: "service.dependency.service", service });

export const semanticDep = (adapterId: string): SemanticDependency =>
  Object.freeze({ kind: "service.dependency.semantic", adapterId });

export interface ServiceDefinition<
  TId extends string = string,
  TDependencies extends Readonly<Record<string, ServiceDependencyDeclaration>> = Readonly<
    Record<string, ServiceDependencyDeclaration>
  >,
  TScope = unknown,
  TConfig = unknown,
  TInvocation = unknown,
> {
  readonly kind: "service.definition";
  readonly id: TId;
  readonly deps: TDependencies;
  readonly scope?: RuntimeSchema<TScope>;
  readonly config?: RuntimeSchema<TConfig>;
  readonly invocation?: RuntimeSchema<TInvocation>;
  readonly metadataDefaults?: Readonly<Record<string, unknown>>;
  readonly baseline?: Readonly<Record<string, unknown>>;
  readonly oc: typeof oc;
  readonly createMiddleware: typeof createMiddleware;
  readonly createImplementer: typeof implement;
}

export function defineService<
  const TId extends string,
  const TDependencies extends Readonly<Record<string, ServiceDependencyDeclaration>>,
  TScope = unknown,
  TConfig = unknown,
  TInvocation = unknown,
>(
  input: Omit<
    ServiceDefinition<TId, TDependencies, TScope, TConfig, TInvocation>,
    "kind" | "oc" | "createMiddleware" | "createImplementer"
  >
): ServiceDefinition<TId, TDependencies, TScope, TConfig, TInvocation> {
  return Object.freeze({
    ...input,
    kind: "service.definition",
    deps: Object.freeze({ ...input.deps }),
    oc,
    createMiddleware,
    createImplementer: implement,
  });
}

export type ServiceOf<TDefinition extends ServiceDefinition> = TDefinition;

export interface ServiceUse<TService extends ServiceDefinition = ServiceDefinition> {
  readonly kind: "plugin.service-use";
  readonly service: TService;
  readonly alias?: string;
}

export function useService<const TService extends ServiceDefinition>(
  service: TService,
  options: { readonly alias?: string } = {}
): ServiceUse<TService> {
  return Object.freeze({ kind: "plugin.service-use", service, ...options });
}
