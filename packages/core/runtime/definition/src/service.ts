import type { RuntimeSchema } from "../../schema/src/runtime-schema";
import type { RuntimeResource } from "./resource";

export interface ResourceDependency<TResource extends RuntimeResource = RuntimeResource> {
  readonly kind: "service.dependency.resource";
  readonly resource: TResource;
}

export interface ServiceDependency {
  readonly kind: "service.dependency.service";
  readonly serviceId: string;
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
export const serviceDep = (serviceId: string): ServiceDependency =>
  Object.freeze({ kind: "service.dependency.service", serviceId });
export const semanticDep = (adapterId: string): SemanticDependency =>
  Object.freeze({ kind: "service.dependency.semantic", adapterId });

export interface ServiceDefinition<
  TId extends string = string,
  TDependencies extends Readonly<Record<string, ServiceDependencyDeclaration>> = Readonly<
    Record<string, ServiceDependencyDeclaration>
  >,
> {
  readonly kind: "service.definition";
  readonly id: TId;
  readonly deps: TDependencies;
  readonly scope?: RuntimeSchema<unknown>;
  readonly config?: RuntimeSchema<unknown>;
  readonly invocation?: RuntimeSchema<unknown>;
  readonly metadataDefaults?: Readonly<Record<string, unknown>>;
  readonly baseline?: Readonly<Record<string, unknown>>;
}

export function defineService<
  const TId extends string,
  const TDependencies extends Readonly<Record<string, ServiceDependencyDeclaration>>,
>(
  input: Omit<ServiceDefinition<TId, TDependencies>, "kind">
): ServiceDefinition<TId, TDependencies> {
  return Object.freeze({
    ...input,
    kind: "service.definition",
    deps: Object.freeze({ ...input.deps }),
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
